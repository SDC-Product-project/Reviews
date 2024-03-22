
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
const formatReviewList = ((objArray)=>{
  const result = objArray.map((item)=>{
    return {
      ...item,
      characteristics: undefined,
      char: undefined,
      reported: undefined,
      reviewer_email: undefined
    }
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
    let range = getIndexRange(query.count, query.page);
    let data = await db.reviews.find({product_id: query.product_id, reported: false}, {'_id': 0, 'char._id':0}).sort({/*helpfulness*/id: 1}).limit(query.count || 1000).skip(range.start).lean().exec();
    const output =  {
      product: query.product_id,
      page: Number(query.page),
      count: data.length,
      results: formatReviewList(data),
    }
    return output;
}