
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const model = mongoose.model;
require('dotenv').config()
console.log('mytst', process.env.USERNAME);

if(process.env.USER === undefined || process.env.USERNAME === ""){
   mongoose.connect(`${process.env.DB_URL}/reviews`)
} else {
   mongoose.connect(`${process.env.DB_URL}/reviews`, {
    authSource: 'reviews',
    user: process.env.USER,
    pass: process.env.PASS,
})
}

const reviewSchema = Schema({
  id: {type: Number, unique: true},
  product_id: Number,
  rating: Number,
  date: Date,
  summary: String,
  body: String,
  recommend: Boolean,
  reported: Boolean,
  reviewer_name: {type: String, maxlength: 60},
  reviewer_email: String,
  helpfulness: Number,
  response: String,
  photos: [String],
  characteristics: {},
})
let Review = model('Review', reviewSchema);

const metadataSchema = Schema({
  product_id: Number,
  averageRating: Number,
  ratings: {
    0: Number,
    1: Number,
    2: Number,
    3: Number,
    4: Number,
    5: Number,
  },
  recommended: {"true": Number, "false": Number},
  characteristics: {},
})
let Metadata = model('Metadata', metadataSchema, 'metadata');

module.exports.reviews = Review;
module.exports.metadata = Metadata;



