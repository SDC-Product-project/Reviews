
const db = require('./schema.js')
const test = async()=>{
  const a = await db.characteristic.insertMany( [
    {
       name: 'Fit',
    },
    {
       name: 'Quality',
    },
    {
       name: 'Comfort',
    }
 ] )
//console.log(a);
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
return res
}
test()
.then((res)=>{
  console.log('First res', res)
  let formatted = res.characteristics.map((item)=>{
   // console.log(item)
    return {[item._characteristic.name]: {
      rating: item.rating,
      id: item._characteristic._id
    }
    }
  })
  formatted = Object.assign({}, ...formatted);
  let z = res.toObject();
  z.characteristics = formatted;
  console.log(z);
})