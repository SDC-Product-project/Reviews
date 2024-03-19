/* eslint-disable no-undef */
db = connect( 'mongodb://localhost:27017/reviews' );
db.characteristics.drop({})
const a = db.characteristics.insertMany( [
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

db.reviews.drop({})
db.reviews.insertOne(
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
    characteristics: [{
      _characteristics: a.insertedIds[0].toString(),
      rating: 5
    }]
  }
)
