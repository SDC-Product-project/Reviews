const express = require('express');
const morgan = require('morgan');
const db = require('./db/controller')
const app = express();
const port = 3000;
app.use(morgan('dev'));
app.use(express.json());
/*
QueryParameters
Parameter	Type	Description
page	integer	Selects the page of results to return. Default 1.
count	integer	Specifies how many results per page to return. Default 5.
sort	text	Changes the sort order of reviews to be based on "newest", "helpful", or "relevant"
product_id	integer	Specifies the product for which to retrieve reviews.
*/


app.get('/reviews',(req, res)=>{
  db.getReviewsByProductID(req.query)
  .then((data)=>{
    res.send(data);
    res.end();
  })
  .catch((err)=>{
    console.log(err);
  })

})

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
app.get('/reviews/meta',(req, res)=>{
  db.getMetadata(Number(req.query.product_id))
  .then((data)=>{
    res.send(data)
    res.status(201)
  })
  .catch((err)=>{ res.send(err) })
  .finally(()=>{ res.end() })
})


app.put('/reviews/:review_id/helpful',(req, res)=>{
  db.markAsHelpful(req.params.review_id)
  .then((data)=>{
    res.status(204)
    res.send(data);
  })
  .catch((err)=>{
    console.log(err)
  })
  .finally(()=>{
    res.end();
  })
})
app.put('/reviews/:review_id/report',(req, res)=>{
  db.report(req.params.review_id)
  .then((data)=>{
    res.status(204)
    res.send(data);
  })
  .catch((err)=>{
    console.log(err)
  })
  .finally(()=>{
    res.end();
  })
})

app.post('/reviews', (req, res)=>{
  res.end();
})

app.listen(3000, ()=>{
    console.log(`listening on port ${port}`);
});

