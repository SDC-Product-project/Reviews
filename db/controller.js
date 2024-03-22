
const db = require('./schema.js')
const test = async()=>{
}
//console.log(a);
/*
 await db.reviews.create(
   { productID: 123456,
     reviewer_name: "Chris",
     email: "email@email.com",
     rating: 4,
     summary: "Test summary",
     body: "This is my review, 50char",
     recommend: true,
     helpfulness: 4,
     date: new Date(),
     reported: false,
     response: "Test reply",
     photos: ['https://i.imgur.com/B1MCOtx.jpeg', 'https://i.imgur.com/B1MCOtx.jpeg'],
     characteristics: [
      {
       _characteristic: a[0]._id,
       rating: 5
      },
      {
        _characteristic: a[1]._id,
        rating: 2
       },

    ]
   }
 )

 let res = await db.reviews.findOne({reviewer_name: 'Chris'})
 .populate({
   path: 'characteristics',
   populate: {path: '_characteristic', populate: 'name'},
 },)
 .exec()
 */

/*
 const formatReviewList = ((objArray)=>{
  const result = objArray.map((item)=>{
    return {
      ...item,
      characteristics: item.char,
      char: undefined
    }
  })
  return result;
  });


const findReviews  = async (params) => {
  return db.reviews.find({product_id: params.product_id}, {'_id': 0, 'char._id':0}).lean().exec();
  };

module.exports.getByProductID =  (params) => {
return new Promise((resolve, reject)=>{
  findReviews(params)
  .then((data)=>{
    resolve(formatReviewList(data));
  })
  .catch((err)=>{
    reject(err);
  })
})
//return formatReviewList(result);
};
*/

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
  // num pages = number of results / pages
  // page 1 = 1 to 6
  // page 2 = 7 to 12
  // page 3 = 13 to 18
  //starting index: count*page - count -1
  //ending index: count*page
  count = Number(count)
  page = Number(page)
  const starting = count * page - count;
  const ending = count * page ;
  return {start: starting, end: ending}

}


//Implement sorting in get request by the three metrics.
module.exports.getReviewsByProductID = async (query) => {
  //If undefined, run the await without sorting.
  //If relevant, do something, do helpfulness for now
  //If helpful sort by helpfulness.
    let range = getIndexRange(query.count, query.page);
    let data;
    if (query.sort === "helpful"){
      data = await db.reviews.find({product_id: query.product_id, reported: false}, {'_id': 0, 'char._id':0}).sort({helpfulness: -1}).limit(query.count || 1000).skip(range.start).lean().exec();
    } else if (query.sort === 'relevant'){
      data = await db.reviews.find({product_id: query.product_id, reported: false}, {'_id': 0, 'char._id':0}).sort({helpfulness: -1}).limit(query.count || 1000).skip(range.start).lean().exec();
    } else if (query.sort === 'newest'){
      data = await db.reviews.find({product_id: query.product_id, reported: false}, {'_id': 0, 'char._id':0}).sort({id: -1}).limit(query.count || 1000).skip(range.start).lean().exec();
    } else {
      data = await db.reviews.find({product_id: query.product_id, reported: false}, {'_id': 0, 'char._id':0}).sort({helpfulness: -1}).limit(query.count || 1000).skip(range.start).lean().exec();
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
const formatCharData = (metadata, charData)=>{
let output = {};
charData.forEach((data)=>{
  output[data._id] = {char_id: data.char_id, value: data.avgValue};
})
return output;
}
module.exports.getMetadata = async ()=>{
  let metadata = await db.reviews.aggregate(
    [
      {
        '$match': {
          'product_id': 40346
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
          'product_id': 40346
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
  //return formatMetadata(metadata, charMetadata);
  return metadata;
}
/*
Get Review Metadata
Returns review metadata for a given product.
GET /reviews/meta
Query Parameters
Parameter	Type	Description
product_id	integer	Required ID of the product for which data should be returned

{
    "product_id": "40346",
    "ratings": {
        "1": "27",
        "2": "56",
        "3": "69",
        "4": "53",
        "5": "105"
    },
    "recommended": {
        "false": "88",
        "true": "222"
    },
    "characteristics": {
        "Fit": {
            "id": 135224,
            "value": "3.0000000000000000"
        },
        "Length": {
            "id": 135225,
            "value": "3.2336065573770492"
        },
        "Comfort": {
            "id": 135226,
            "value": "3.1557377049180328"
        },
        "Quality": {
            "id": 135227,
            "value": "3.4750000000000000"
        }
    }
}
*/