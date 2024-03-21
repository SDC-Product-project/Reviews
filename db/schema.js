
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const model = mongoose.model;
mongoose.connect('mongodb://localhost:27017/reviews');

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
  char: [{name: String, characteristic_id: Number, value: Number}],
})
let Review = model('Review', reviewSchema);
module.exports.reviews = Review;



