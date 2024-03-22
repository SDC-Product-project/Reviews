
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

const relevantAgg = (product_id)=>([
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
      data = await db.reviews.aggregate(relevantAgg(query.product_id)).limit(Number(query.count) || 1000).skip(range.start).exec();
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
  let res = await db.reviews.findOne({id: review_id}, {$inc: {helpful: 1}}).lean().exec();
  return res;
}
module.exports.report = async (review_id) =>{
  let res = await db.reviews.findOne({id: review_id}, {reported: true}).lean().exec();
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
          'product_id': Number(product_id)
        }
      }, {
        '$group': {
          '_id': '$product_id',
          'recommend': {'$sum': {'$cond': [{ '$eq': [ '$recommend', true]}, 1, 0 ]}},
          'notrecommend': { '$sum': { '$cond': [ { '$eq': [ '$recommend', false ] }, 1, 0]}},
          'averageRating': {'$avg': '$rating' },
          'oneStar': {'$sum': { '$cond': [{'$eq': ['$rating', 1]}, 1, 0 ] }},
          'twoStar': {'$sum': { '$cond': [{ '$eq': [ '$rating', 2 ] }, 1, 0 ] }},
          'threeStar': { '$sum': {  '$cond': [ { '$eq': [ '$rating', 3 ] }, 1, 0]}},
          'fourStar': {'$sum': {'$cond': [{ '$eq': [ '$rating', 4 ] }, 1, 0]}},
          'fiveStar': { '$sum': { '$cond': [{ '$eq': [  '$rating', 5 ]}, 1,0 ]}}
        }
      }
    ]
  ).exec();
  let charMetadata = await db.reviews.aggregate(
    [
      {
        '$match': {
          'product_id': Number(product_id)
        }
      }, {
        '$project': {
          'char': '$char'
        }
      }, {
        '$unwind': {
          'path': '$char',
          'includeArrayIndex': 'string',
          'preserveNullAndEmptyArrays': true
        }
      }, {
        '$group': {
          '_id': '$char.name',
          'char_id': {
            '$first': '$char.characteristic_id'
          },
          'avgValue': {
            '$avg': '$char.value'
          }
        }
      }
    ]
  )
  return formatMetadata(metadata, charMetadata);
}
