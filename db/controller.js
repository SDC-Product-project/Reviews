
const db = require('./schema.js')

//Remove this to improve performance, have db not return this data.
const formatReviewList = ((objArray)=>{
  const result = objArray.map((item)=>{
    let obj =  item;
    delete obj.characteristics;
    delete obj.char;
    delete obj.reported;
    delete obj.reviewer_email;
    return obj;
  })
  return result;
});
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
      'product_id': Number(product_id)
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
  }
])

//Implement sorting in get request by the three metrics.
module.exports.getReviewsByProductID = async (query) => {
  //If undefined, run the await without sorting.
  //If relevant, do something, do helpfulness for now
  //If helpful sort by helpfulness.
    let range = getIndexRange(Number(query.count) , query.page);
    let data;
    if (query.sort === "helpful"){
      data = await db.reviews.find({product_id: query.product_id, reported: false}, {'_id': 0, 'char._id':0}).sort({helpfulness: -1}).limit(Number(query.count)  || 1000).skip(range.start).lean().exec();
    } else if (query.sort === 'newest'){
      data = await db.reviews.find({product_id: query.product_id, reported: false}, {'_id': 0, 'char._id':0}).sort({id: -1}).limit(Number(query.count)  || 1000).skip(range.start).lean().exec();
    } else {
      data = await db.reviews.aggregate(relevantAgg(query.product_id, range.start)).limit(Number(query.count) || 1000).exec();
    }
    const output =  {
      product: query.product_id,
      page: Number(query.page),
      count: data.length,
      results: formatReviewList(data),
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
}
//add product ID param;
module.exports.getMetadata = async (product_id)=>{
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
      'rating': {
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
      'averageRating': 1,
      'rating': 1
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
  metadata[0].characteristics = charMetadata[0];
  return metadata;
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


const formatReviewChar = (names, review)=>{
  //Create an array of objects
  let output = [];
  //console.log('n', names);
  names.char.forEach((item, index)=>{
    console.log('i', item)
    output.push({
    name: item.name,
    characteristic_id: item.characteristic_id || index,
    value: review[item.characteristic_id],
    })
  })
  return output
}
module.exports.postReview = async (review) => {
console.log(review);
const charNames = await db.reviews.findOne({product_id: 40346}, {'char': 1}).exec()
const lastReviewID = await db.reviews.find({}, {'id': 1, '_id': 0}).limit(1).sort({$natural:-1}).exec()
const nextID = lastReviewID[0]['id'] + 1
const char = formatReviewChar(charNames, review.characteristics);
const newReview = {
  ...review,
  char: char,
  id: nextID,
  date: new Date(),
  helpfulness: 0,
  reported: false,
  reviewer_name: review.name,
  reviewer_email: review.email
}
delete newReview.characteristics
console.log(newReview);
const newRev = await db.reviews.create(newReview);
return newRev
}



