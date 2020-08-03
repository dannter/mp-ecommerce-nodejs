var express = require('express');
var exphbs  = require('express-handlebars');

var app = express();
var  mp =  require('mercadopago');

const PORT = process.env.PORT || 5000
const URL_APP = "localhost/5000";
//const URL_APP = "https://dannter-mp-ecommerce-nodejs.herokuapp.com";

mp.configure({
    integrator_id: 'dev_24c65fb163bf11ea96500242ac130004',
    access_token: 'APP_USR-1159009372558727-072921-8d0b9980c7494985a5abd19fbe921a3d-617633181',
});
 


app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');


function createPreferences(payer, order, item) {
  const preferences = {
      auto_return: 'approved',

      payment_methods: {
          excluded_payment_types: [
              { id: 'atm' }
          ],
          excluded_payment_methods: [
              { id: 'amex' }
          ],
          installments: 6,
          default_installments: 1
      },

      notification_url : URL_APP+"/notif",
    

      back_urls: {
                                  success: URL_APP+'/success',
                                  failure: URL_APP+'/failure',
                                  pending: URL_APP+'/pending'
      },

      external_reference: order.number,

      payer: {
          name: payer.name,
          surname: payer.surname,
          email: payer.email,
          date_created: new Date().toISOString(),
          identification: {
              type: payer.identification.type,
              number: payer.identification.number.toString()
          },
          phone: {
              area_code: payer.phone.area_code,
              number: payer.phone.number
          },
          address: {
              street_name: payer.address.street_name,
              street_number: payer.address.street_number,
              zip_code: payer.address.zip_code
          }
      },
      items:
          [
              {
                  id: item.id,
                  title: item.title,
                  description: item.description,
                  picture_url: item.picture_url,
                  quantity: item.quantity,
                  category_id: item.category,
                  currency_id: 'MXN',
                  unit_price: parseFloat(item.unit_price)
              }
          ]
  };

  return preferences;
}

// Crea un objeto de preferencia
function createPayment(req) {
  const item = {
      id: 1234,
      title: req.query.title,
      description: 'Dispositivo móvil de Tienda e-commerce',
      picture_url: req.query.img,
      quantity: parseInt(req.query.unit),
      unit_price: parseFloat(req.query.price),
      category: 'Smartphones',

  };

  const payer = {
      name: 'Lalo',
      surname: 'Landa',
      email: 'test_user_58295862@testuser.com',
      identification: {
          type: 'DNI',
          number: 2233344
      },
      phone: {
          area_code: '52',
          number: 5549737300
      },
      address: {
          street_name: 'Insurgentes Sur',
          street_number: 1602,
          zip_code: '03940'
      }
  };

  const order = {
      number: "daescrux@gmail.com"
  };

  return createPreferences(payer, order, item);
}


app.get('/', function (req, res) {
    res.render('home');
});


app.get('/notif', function (req, res) {
  console.log(JSON.stringify(req));
  res.status(200).send('OK');
});

app.get('/failure', function (req, res) {
    res.render('failure', req);
});

app.get('/pending', function (req, res) {
    res.render('pending', req);
});

app.get('/rejected', function (req, res) {
    res.render('rejected', req);
});


app.get('/success', function (req, res) {
    res.render('succes', req);
})


app.get('/detail', function (req, res) {

  const preference = createPayment(req);

    mp.preferences.create(preference)
    .then(function (preference) {
        req.query.preference_id = preference.body.id;
        req.query.init_point = preference.body.init_point;
        console.log("DATOS" + req.query.init_point );
        res.render('detail', req.query);
    })
    .catch(function (error) {
        let values = {};
        values.message = "Hubo un error "+error;
        console.log(" ERROR " + error);
       // res.redirect('error', values);
    });
    //res.render('detail', req.query);
});

app.post('/pagar', function (req, res) {
  let values = {};
 console.log("inicial el pago....");

  values.payment_status = req.body.payment_status;

  if (values.payment_status == 'pending') {
      values.message = getPendingDescription(req.body.payment_status_detail);
      res.render('pending', values);
  } else if (values.payment_status == 'rejected') {
      values.message = getRejectDescription(req.body.payment_status_detail);
      res.render('rejected', values);
  } else if (values.payment_status == 'approved') {
      mercadopago.payment.get(req.body.payment_id)
          .then(function (response) {
              values.status = response.body.status;

              if (values.status == 'approved') {

                  values.message = "Realizaste tu compra.";

                  values.price = response.body.transaction_amount;

                  values.payment_method_id = response.body.payment_method_id;

                  values.order_number = response.body.external_reference;

                  values.payment_id = response.body.id;

                  values.order_id = response.body.order.id;

                  res.render('success', values);
              } else {
                  values.errors = response.body.errors;
                  res.render('error', values);
              }
          })
          .catch(function (error) {
              let values = {};
              values.message = "Hubo un error";
              res.redirect('error', values);
          });
  } else {
      let values = {};

      values.message = "Hubo un error";

      res.redirect('error', values);
  }

   console.log("PAGADO....");
});


app.use(express.static('assets'));
 
app.use('/assets', express.static(__dirname + '/assets'));
 
app.listen(PORT, () => console.log(`Listening on ${ PORT }`));