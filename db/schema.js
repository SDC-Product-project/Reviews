
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const model = mongoose.model;
//require('dotenv').config();

mongoose.connect('mongodb://localhost:27017/reviews');


const characteristicSchema = Schema({
  name: String,
  })

const reviewSchema = Schema({
  productID: Number,
  reviewer_name: {type: String, maxlength: 60},
  email: String,
  rating: Number,
  summary: String,
  body: String,
  recommend: Boolean,
  helpfulness: Number,
  date: Date,
  reported: Boolean,
  response: String,
  photos: [String],
  characteristics: [{
    _characteristics: {type: Schema.Types.ObjectId, ref: 'Characteristic'},
    rating: Number
  }],
})
let Characteristic = model('Characteristic', characteristicSchema);
let Review = model('Review', reviewSchema);
module.exports.characteristic = Characteristic;
module.exports.reviews = Review;



