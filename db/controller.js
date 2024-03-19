
const db = require('./schema.js')
db.reviews.findOne({reviewer_name: 'Chris'})
.populate({
  path: 'characteristics',
  populate: {path: '_characteristics', populate: 'name'},
},)
.exec()
.then((res)=>{
  delete res.characteristics[0]['_id']
  console.log();
})
