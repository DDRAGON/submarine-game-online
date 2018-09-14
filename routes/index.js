var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: '潜水艦ゲーム', bodyClass: 'top', user: req.user });
});

module.exports = router;
