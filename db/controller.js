
const db = require('./schema.js')

const getIndexRange = (count, page) => {
  count = Number(count)
  page = Number(page)
  const starting = count * page - count;
  const ending = count * page ;
  return {start: starting, end: ending}
}

const relevantAgg = (product_id, skip)=>([
  {
    '$match': {
      'product_id': Number(product_id),
      'reported': false
    }
  }, {
    '$setWindowFields': {
      'sortBy': {
        'date': -1
      },
      'output': {
        'dateRank': {
          '$rank': {}
        }
      }
    }
  }, {
    '$setWindowFields': {
      'sortBy': {
        'helpfulness': -1
      },
      'output': {
        'helpfulnessRank': {
          '$rank': {}
        }
      }
    }
  }, {
    '$addFields': {
      'relevantRank': {
        '$avg': [
          '$dateRank', '$helpfulnessRank'
        ]
      }
    }
  }, {
    '$sort': {
      'relevantRank': 1
    }
  }, {
    '$skip': skip
  }, {
    '$project': {
      '_id': 0,
      'reviewer_email': 0,
      'reported': 0,
      'characteristics': 0
    }
  }
])

//Implement sorting in get request by the three metrics.
module.exports.getReviewsByProductID = async (query) => {
  //If undefined, run the await without sorting.
  //If relevant, do something, do helpfulness for now
  //If helpful sort by helpfulness.
    let range = getIndexRange(Number(query.count) , query.page);
    let data;
    console.log(query);
    if (query.sort === "helpful"){
      data = await db.reviews.find({product_id: Number(query.product_id), reported: false}, {
        '_id': 0,
        'reviewer_email': 0,
        'reported': 0,
        'characteristics': 0
      }).sort({helpfulness: -1}).limit(Number(query.count)  || 1000).skip(range.start).lean().exec();
    } else if (query.sort === 'newest'){
      data = await db.reviews.find({product_id: Number(query.product_id), reported: false}, {
        '_id': 0,
        'reviewer_email': 0,
        'reported': 0,
        'characteristics': 0
      }).sort({id: -1}).limit(Number(query.count)  || 1000).skip(range.start).lean().exec();

    } else {
      data = await db.reviews.aggregate(relevantAgg(query.product_id, range.start)).limit(Number(query.count) || 1000).exec();
    }
    console.log(range)
    const output =  {
      product: query.product_id,
      page: Number(query.page),
      count: data.length,
      results: data,
    }
    return output;
}

module.exports.markAsHelpful = async (review_id) =>{
  let res = await db.reviews.updateOne({id: review_id}, {$inc: {helpfulness: 1}}).lean().exec();
  return res;
}
module.exports.report = async (review_id) =>{
  let res = await db.reviews.updateOne({id: review_id}, {reported: true}).lean().exec();
  return res;
}
/*
const formatMetadata = (metadata, charData)=>{
  metadata = metadata[0];
  console.log('FM', metadata)
let output = {};
output.product_id = metadata._id;
output.ratings = {
  1: metadata.oneStar,
  2: metadata.twoStar,
  3: metadata.threeStar,
  4: metadata.fourStar,
  5: metadata.fiveStar,
}
output.recommended = {
  true: metadata.recommend,
  false: metadata.notrecommend
}

let charObject = {};
charData.forEach((data)=>{
  charObject[data._id] = {char_id: data.char_id, value: data.avgValue};
})
output.characteristics = charObject;
return output;
}*/


//add product ID param;

const recalcMetadata = async (product_id)=>{
  let metadata = await db.reviews.aggregate(
[
  {
    '$match': {
      'product_id': product_id
    }
  }, {
    '$group': {
      '_id': '$product_id',
      'recommend': {
        '$sum': {
          '$cond': [
            {
              '$eq': [
                '$recommend', true
              ]
            }, 1, 0
          ]
        }
      },
      'notrecommend': {
        '$sum': {
          '$cond': [
            {
              '$eq': [
                '$recommend', false
              ]
            }, 1, 0
          ]
        }
      },
      'averageRating': {
        '$avg': '$rating'
      },
      '1': {
        '$sum': {
          '$cond': [
            {
              '$eq': [
                '$rating', 1
              ]
            }, 1, 0
          ]
        }
      },
      '2': {
        '$sum': {
          '$cond': [
            {
              '$eq': [
                '$rating', 2
              ]
            }, 1, 0
          ]
        }
      },
      '3': {
        '$sum': {
          '$cond': [
            {
              '$eq': [
                '$rating', 3
              ]
            }, 1, 0
          ]
        }
      },
      '4': {
        '$sum': {
          '$cond': [
            {
              '$eq': [
                '$rating', 4
              ]
            }, 1, 0
          ]
        }
      },
      '5': {
        '$sum': {
          '$cond': [
            {
              '$eq': [
                '$rating', 5
              ]
            }, 1, 0
          ]
        }
      }
    }
  }, {
    '$addFields': {
      'ratings': {
        '1': '$1',
        '2': '$2',
        '3': '$3',
        '4': '$4',
        '5': '$5'
      },
      'recommended': {
        'true': '$recommend',
        'false': '$notrecommend'
      }
    }
  }, {
    '$project': {
      'product_id': '$_id',
      '_id': 0,
      'ratings': 1,
      'recommended': 1,
    }
  }
]
  ).exec();
  let charMetadata = await db.reviews.aggregate(
    [
      {
        '$match': {
          'product_id': product_id
        }
      }, {
        '$addFields': {
          'characteristics': {
            '$map': {
              'input': {
                '$objectToArray': '$characteristics'
              },
              'as': 'm',
              'in': {
                'name': '$$m.k',
                'characteristic_id': '$$m.v.characteristic_id',
                'value': '$$m.v.value'
              }
            }
          }
        }
      }, {
        '$unwind': {
          'path': '$characteristics',
          'includeArrayIndex': 'string',
          'preserveNullAndEmptyArrays': true
        }
      }, {
        '$group': {
          '_id': '$characteristics.name',
          'char_id': {
            '$first': '$characteristics.characteristic_id'
          },
          'avgValue': {
            '$avg': '$characteristics.value'
          }
        }
      }, {
        '$addFields': {
          'characteristics': {
            '$mergeObjects': [
              {
                '$arrayToObject': [
                  [
                    {
                      'k': '$_id',
                      'v': {
                        'value': '$avgValue',
                        'id': '$char_id'
                      }
                    }
                  ]
                ]
              }
            ]
          }
        }
      }, {
        '$replaceRoot': {
          'newRoot': '$characteristics'
        }
      }, {
        '$group': {
          '_id': null,
          'Output': {
            '$mergeObjects': '$$CURRENT'
          }
        }
      }, {
        '$replaceRoot': {
          'newRoot': '$Output'
        }
      }
    ]
  )
  //return formatMetadata(metadata, charMetadata);
  //metadata[0].characteristics = charMetadata[0];
  metadata[0].characteristics = charMetadata[0];
  return metadata[0];
}
/*
{
    "product_id": 40346,
    "rating": 5,
    "summary": "My summary",
    "body": "My review",
    "recommend": true,
    "name": "Ben",
    "email": "email@email.com",
    "photos": [],
    "characteristics": {
        "134993": 3,
        "134994": 5,
        "134995": 3,
        "134996": 4
    }
}
*/


module.exports.getMetadata = (product_id)=>{
  return db.metadata.findOne({product_id: product_id}).exec();
}
//To show the before and after of this optmization.
module.exports.getMetadata_old = recalcMetadata;


const formatReviewChar = (names, review)=>{
  //Create an array of objects
  let output = {};
  console.log('n', names);
  console.log(review);
  Object.keys(names.characteristics).forEach((key, index)=>{
    //console.log(names.characteristics[key].characteristic_id)
    let name = key || index;
    let currentCharID = names.characteristics[key].characteristic_id
    console.log('ccid', currentCharID);
    output[name] = {
      characteristic_id : currentCharID,
      value: review[currentCharID]
    }
  })
  return output
}


module.exports.postReview = async (review) => {
const charNames = await db.reviews.findOne({product_id: review.product_id}, {'characteristics': 1}).lean().exec();
const characteristics = formatReviewChar(charNames, review.characteristics);
const lastReviewID = await db.reviews.find().sort([['id', -1]] ).limit(1).select({'id': 1});
const nextID = lastReviewID[0]['id'] + 1
console.log(nextID)
console.log('cc', characteristics);

const newReview = {
  ...review,
  id: nextID,
  date: new Date(),
  helpfulness: 0,
  reported: false,
  reviewer_name: review.name,
  reviewer_email: review.email,
  characteristics: characteristics,
}
delete newReview.email;
delete newReview.name;
await db.reviews.create(newReview);
const nextMeta = await recalcMetadata(review.product_id);
console.log('nm');
await db.metadata.replaceOne({product_id: review.product_id}, nextMeta).exec()
let newMeta = await db.metadata.findOne({product_id: review.product_id}).lean().exec();
console.log()
return newMeta;
}



