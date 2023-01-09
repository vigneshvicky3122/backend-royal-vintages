const express = require("express");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const { MongoClient, ObjectId } = require("mongodb");
const Client = new MongoClient(process.env.DB_URL);
const PORT = process.env.PORT || 8000;
const router = express();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { authentication, createToken } = require("./auth");
const { hashPassword, hashCompare } = require("./hashPassword");
const { mailer } = require("./nodeMail");
const { uploadFile } = require("./S3");

router.use(
  bodyParser.json({ limit: "50mb", extended: true, parameterLimit: 50000 }),
  cors({
    origin: "*",
    credentials: true,
  })
);

router.get("/Dashboard", authentication, async (req, res) => {
  await Client.connect();

  try {
    const db = await Client.db(process.env.DB_NAME);
    let products = await db
      .collection(process.env.DB_COLLECTION_ONE)
      .find()
      .toArray();
    let user = await db
      .collection(process.env.DB_COLLECTION_TWO)
      .find({ _id: ObjectId(req.headers.user) })
      .toArray();
    if ((user, products)) {
      res.json({
        statusCode: 200,
        products,
        user,
      });
    } else {
      res.json({
        statusCode: 401,
        message: "Loading...",
      });
    }
  } catch (error) {
    res.json({
      statusCode: 500,
      message: "internal error occurred",
      error: error,
    });
  } finally {
    await Client.close();
  }
});
router.get("/product/:id", authentication, async (req, res) => {
  await Client.connect();

  try {
    const db = await Client.db(process.env.DB_NAME);
    let products = await db
      .collection(process.env.DB_COLLECTION_ONE)
      .find({ _id: ObjectId(req.params.id) })
      .toArray();
    if (products) {
      res.json({
        statusCode: 200,
        products,
      });
    } else {
      res.json({
        statusCode: 401,
        message: "Loading...",
      });
    }
  } catch (error) {
    res.json({
      statusCode: 500,
      message: "internal error occurred",
      error: error,
    });
  } finally {
    await Client.close();
  }
});
router.get("/orders", authentication, async (req, res) => {
  await Client.connect();
  const db = await Client.db(process.env.DB_NAME);
  try {
    if (req.headers.user === "6389f63fb128d4871a0dc445") {
      let orders = await db
        .collection(process.env.DB_COLLECTION_THREE)
        .find()
        .toArray();
      if (orders) {
        res.json({
          statusCode: 200,
          orders,
        });
      } else {
        res.json({
          statusCode: 401,
          message: "Loading...",
        });
      }
    } else {
      let orders = await db
        .collection(process.env.DB_COLLECTION_THREE)
        .find({ userId: req.headers.user })
        .toArray();
      if (orders) {
        res.json({
          statusCode: 200,
          orders,
        });
      } else {
        res.json({
          statusCode: 401,
          message: "Loading...",
        });
      }
    }
  } catch (error) {
    res.json({
      statusCode: 500,
      message: "internal server error ",
      error: error,
    });
  } finally {
    await Client.close();
  }
});
router.get("/buyProduct/:id", authentication, async (req, res) => {
  await Client.connect();

  try {
    const db = await Client.db(process.env.DB_NAME);
    let products = await db
      .collection(process.env.DB_COLLECTION_THREE)
      .find({ _id: ObjectId(req.params.id) })
      .toArray();

    if (products) {
      res.json({
        statusCode: 200,
        products,
      });
    } else {
      res.json({
        statusCode: 401,
        message: "Loading...",
      });
    }
  } catch (error) {
    res.json({
      statusCode: 500,
      message: "internal error occurred",
      error: error,
    });
  } finally {
    await Client.close();
  }
});

router.get("/MyCart", authentication, async (req, res) => {
  await Client.connect();
  try {
    const db = await Client.db(process.env.DB_NAME);
    let user = await db
      .collection(process.env.DB_COLLECTION_TWO)
      .find({ _id: ObjectId(req.headers.user) })
      .toArray();

    if (user) {
      res.json({
        statusCode: 200,
        user,
      });
    } else {
      res.json({
        statusCode: 401,
        message: "Loading...",
      });
    }
  } catch (error) {
    res.json({
      statusCode: 500,
      message: "internal error occurred",
      error: error,
    });
  } finally {
    await Client.close();
  }
});
router.put("/addToCart", authentication, async (req, res) => {
  await Client.connect();

  try {
    const db = Client.db(process.env.DB_NAME);
    let products = await db
      .collection(process.env.DB_COLLECTION_ONE)
      .find({ _id: ObjectId(req.body.data) })
      .toArray();

    let data = products.reduce((prev, curr) => ({ ...prev, ...curr }), {});

    let addToCart = await db
      .collection(process.env.DB_COLLECTION_TWO)
      .findOneAndUpdate(
        { _id: ObjectId(req.headers.user) },
        { $push: { MyCart: data } }
      );
    if (addToCart) {
      res.json({
        statusCode: 200,
        message: "product added to Cart",
      });
    } else {
      res.json({
        statusCode: 404,
        message: "Can't added",
      });
    }
  } catch {
    res.json({
      statusCode: 500,
      message: "Internal server error",
    });
  } finally {
    await Client.close();
  }
});

router.put("/removeCart", authentication, async (req, res) => {
  await Client.connect();

  try {
    const db = Client.db(process.env.DB_NAME);
    let products = await db
      .collection(process.env.DB_COLLECTION_THREE)
      .find({ _id: ObjectId(req.body.data) })
      .toArray();
    let removeFromCart = await db
      .collection(process.env.DB_COLLECTION_TWO)
      .findOneAndUpdate(
        { _id: ObjectId(req.headers.user) },
        { $pull: { MyCart: products[0].product[0] } }
      );

    if (removeFromCart) {
      res.json({
        statusCode: 200,
        message: "Product remove from Cart",
      });
    } else {
      res.json({
        statusCode: 404,
        message: "Can't removed",
      });
    }
  } catch {
    res.json({
      statusCode: 500,
      message: "Internal server error",
    });
  } finally {
    await Client.close();
  }
});
router.put("/removeFromCart", authentication, async (req, res) => {
  await Client.connect();

  try {
    const db = Client.db(process.env.DB_NAME);
    let products = await db
      .collection(process.env.DB_COLLECTION_ONE)
      .find({ _id: ObjectId(req.body.data) })
      .toArray();
    let data = products.reduce((prev, curr) => ({ ...prev, ...curr }), {});
    let removeFromCart = await db
      .collection(process.env.DB_COLLECTION_TWO)
      .findOneAndUpdate(
        { _id: ObjectId(req.headers.user) },
        { $pull: { MyCart: data } }
      );
    if (removeFromCart) {
      res.json({
        statusCode: 200,
        message: "Product remove from Cart",
      });
    } else {
      res.json({
        statusCode: 404,
        message: "Can't removed",
      });
    }
  } catch {
    res.json({
      statusCode: 500,
      message: "Internal server error",
    });
  } finally {
    await Client.close();
  }
});
router.post("/signup", async (req, res) => {
  await Client.connect();
  try {
    const db = await Client.db(process.env.DB_NAME);
    let users = await db
      .collection(process.env.DB_COLLECTION_TWO)
      .find({ email: req.body.email })
      .toArray();
    if (users.length === 0) {
      let hashedPassword = (req.body.password = await hashPassword(
        req.body.password
      ));
      if (hashedPassword) {
        let user = await db
          .collection(process.env.DB_COLLECTION_TWO)
          .insertOne(req.body);
        if (user) {
          res.json({
            statusCode: 200,
            message: "Signup successful",
          });
        }
      } else {
        res.json({
          statusCode: 404,
          message: "password not found",
        });
      }
    } else {
      res.json({
        statusCode: 401,
        message: "User was already exist, please Login...",
      });
    }
  } catch (error) {
    res.json({
      statusCode: 500,
      message: "Internal server error",
    });
  } finally {
    await Client.close();
  }
});
router.post("/login", async (req, res) => {
  await Client.connect();

  try {
    const db = await Client.db(process.env.DB_NAME);
    let user = await db
      .collection(process.env.DB_COLLECTION_TWO)
      .find({ email: req.body.email })
      .toArray();

    if (user.length === 1) {
      let hashResult = await hashCompare(req.body.password, user[0].password);

      if (hashResult) {
        let token = await createToken(req.body.email, req.body.name);
        if (token) {
          res.json({
            statusCode: 200,
            message: "Login successful",
            token,
            user,
          });
        } else {
          res.json({
            statusCode: 401,
            message: "token not found",
          });
        }
      } else {
        res.json({
          statusCode: 404,
          message: "invalid credentials",
        });
      }
    } else {
      res.json({
        statusCode: 402,
        message: "User does not exist",
      });
    }
  } catch {
    res.json({
      statusCode: 500,
      message: "Internal server error",
    });
  } finally {
    await Client.close();
  }
});

router.post("/address", authentication, async (req, res) => {
  await Client.connect();
  try {
    const result = await uploadFile(req.body.Files);
    console.log(result);
    const shippingAddress = {
      Name: req.body.Name,
      Email: req.body.Email,
      Address: req.body.Address,
      Mobile: req.body.Mobile,
      AlternativeMobile: req.body.Alt,
      Proof: process.env.AWS_CLOUDFRONT_KEY + result.Key,
    };
    const db = Client.db(process.env.DB_NAME);
    let order = await db
      .collection(process.env.DB_COLLECTION_THREE)
      .findOneAndUpdate(
        { _id: ObjectId(req.body.orderId) },
        { $push: { shippingAddress } }
      );
    if (order) {
      res.json({
        statusCode: 200,
        message: "Product Added successfully",
      });
    } else {
      res.json({
        statusCode: 404,
        message: "Product can't Added",
      });
    }
  } catch (error) {
    res.json({
      statusCode: 500,
      message: "Internal server error",
    });
  } finally {
    await Client.close();
  }
});
router.post("/checkout", authentication, async (req, res) => {
  await Client.connect();
  try {
    const db = await Client.db(process.env.DB_NAME);
    let product = await db
      .collection(process.env.DB_COLLECTION_ONE)
      .find({ _id: ObjectId(req.body.productId) })
      .toArray();

    let order = await db.collection(process.env.DB_COLLECTION_THREE).insertOne({
      product,
      quantity: req.body.quantity,
      from: req.body.from.from,
      to: req.body.to.to,
      total: req.body.total,
      userId: req.headers.user,
      paymentId: null,
      paymentStatus: null,
      paymentSignature: null,
      paymentSignature: null,
      razorpayOrderId: null,
      shippingAddress: [],
    });

    if (product && order) {
      res.json({
        statusCode: 200,
        message: "Product Added successfully",
        orderId: order.insertedId,
      });
    } else {
      res.json({
        statusCode: 404,
        message: "Product can't Added",
      });
    }
  } catch (error) {
    res.json({
      statusCode: 500,
      message: "Internal server error",
    });
  } finally {
    await Client.close();
  }
});
router.put("/addProducts/:id", authentication, async (req, res) => {
  await Client.connect();
  try {
    const result = await uploadFile(req.body.Image);

    const db = await Client.db(process.env.DB_NAME);
    let NewProduct = await db
      .collection(process.env.DB_COLLECTION_ONE)
      .findOneAndUpdate(
        { _id: ObjectId(req.params.id) },
        {
          $set: {
            ProductName: req.body.ProductName,
            Amount: req.body.Amount,
            Features: req.body.Features,
            Image: process.env.AWS_CLOUDFRONT_KEY + result.Key,
          },
        }
      );

    if (NewProduct) {
      res.json({
        statusCode: 200,
        message: "Product details updated",
      });
    } else {
      res.json({
        statusCode: 404,
        message: "Product can't Added",
      });
    }
  } catch (error) {
    res.json({
      statusCode: 500,
      message: "Internal server error",
    });
  } finally {
    await Client.close();
  }
});
router.post("/addProducts", authentication, async (req, res) => {
  await Client.connect();
  try {
    const result = await uploadFile(req.body.Image);
    const updateData = {
      ProductName: req.body.ProductName,
      Amount: req.body.Amount,
      Features: req.body.Features,
      Image: process.env.AWS_CLOUDFRONT_KEY + result.Key,
    };
    const db = await Client.db(process.env.DB_NAME);
    let NewProduct = await db
      .collection(process.env.DB_COLLECTION_ONE)
      .insertOne(updateData);
    if (NewProduct) {
      res.json({
        statusCode: 200,
        message: "Product Added successfully",
      });
    } else {
      res.json({
        statusCode: 404,
        message: "Product can't Added",
      });
    }
  } catch (error) {
    res.json({
      statusCode: 500,
      message: "Internal server error",
    });
  } finally {
    await Client.close();
  }
});
router.post("/order", authentication, async (req, res) => {
  try {
    const instance = new Razorpay({
      key_id: process.env.RAZOR_PAY_ID,
      key_secret: process.env.RAZOR_PAY_KEY,
    });

    const options = {
      amount: req.body.amount * 100,
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
    };

    instance.orders.create(options, (error, order) => {
      if (error) {
        console.log(error);
        return res.status(404).json({ message: "Something Went Wrong!" });
      }
      res.status(200).json({ data: order });
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error!" });
    console.log(error);
  }
});
router.post("/verify", authentication, async (req, res) => {
  await Client.connect();
  try {
    const {
      response: { razorpay_order_id, razorpay_payment_id, razorpay_signature },

      orderId,
    } = req.body;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZOR_PAY_kEY)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const db = await Client.db(process.env.DB_NAME);
      let addToCart = await db
        .collection(process.env.DB_COLLECTION_THREE)
        .findOneAndUpdate(
          { _id: ObjectId(orderId) },
          {
            $set: {
              paymentId: razorpay_payment_id,
              razorpayOrderId: razorpay_order_id,
              paymentStatus: "Success",
              paymentSignature: razorpay_signature,
            },
          }
        );
      if (addToCart) {
        return res.status(200).json({ message: "Payment successful" });
      }
    } else {
      return res.status(404).json({ message: "Invalid signature sent!" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error!" });
    console.log(error);
  } finally {
    await Client.close();
  }
});
router.delete("/deleteProduct/:id", authentication, async (req, res) => {
  await Client.connect();
  try {
    const db = Client.db(process.env.DB_NAME);
    let products = await db
      .collection(process.env.DB_COLLECTION_ONE)
      .deleteOne({ _id: ObjectId(req.params.id) });
    if (products) {
      res.json({
        statusCode: 200,
        message: "Product Deleted",
      });
    } else {
      res.json({
        statusCode: 404,
        message: "Can't Deleted",
      });
    }
  } catch {
    res.json({
      statusCode: 500,
      message: "Internal server error",
    });
  } finally {
    await Client.close();
  }
});
router.post("/reset-email-verify", async (req, res) => {
  await Client.connect();
  try {
    const db = Client.db(process.env.DB_NAME);

    let user = await db
      .collection(process.env.DB_COLLECTION_TWO)
      .find({ email: req.body.email })
      .toArray();
    if (user.length === 1) {
      let digits = "123456789";
      let OTP = "";
      for (let i = 0; i < 6; i++) {
        OTP += digits[Math.floor(Math.random() * 9)];
      }
      if (OTP) {
        let saveOtp = await db
          .collection(process.env.DB_COLLECTION_TWO)
          .findOneAndUpdate(
            { _id: ObjectId(user[0]._id) },
            { $push: { otp: OTP } }
          );
        if (saveOtp) {
          await mailer(req.body.email, OTP);

          res.json({
            statusCode: 200,
            message: "OTP has sent successful",
          });
        } else {
          res.json({
            statusCode: 402,
            message: "Otp generation failed",
          });
        }
      } else {
        res.json({
          statusCode: 403,
          message: "Otp generation failed",
        });
      }
    } else {
      res.json({
        statusCode: 404,
        message: "User does not exist, Do register...",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      statusCode: 500,
      message: "internal server error",
    });
  } finally {
    await Client.close();
  }
});
router.post("/reset-otp-verify", async (req, res) => {
  await Client.connect();
  try {
    const db = Client.db(process.env.DB_NAME);
    let user = await db
      .collection(process.env.DB_COLLECTION_TWO)
      .find({ email: req.body.user })
      .toArray();
    if (user) {
      let verify = user[0].otp.includes(req.body.data.otp);
      if (verify) {
        res.json({
          statusCode: 200,
          message: "Verification successful. Wait...",
          userId: user[0]._id,
        });
      } else {
        res.json({
          statusCode: 401,
          message: "invalid Otp",
        });
      }
    } else {
      res.json({
        statusCode: 402,
        message: "User does not exist",
      });
    }
  } catch {
    res.json({
      statusCode: 500,
      message: "internal server error",
    });
  } finally {
    await Client.close();
  }
});
router.put("/password-reset/:id", async (req, res) => {
  await Client.connect();
  try {
    const Db = Client.db(process.env.DB_NAME);
    let users = await Db.collection(process.env.DB_COLLECTION_TWO)
      .find({ _id: ObjectId(req.params.id) })
      .toArray();
    if (users) {
      if (req.body.password === req.body.confirmPassword) {
        let hashpassword = await hashPassword(req.body.password);

        if (hashpassword) {
          let update = await Db.collection(
            process.env.DB_COLLECTION_TWO
          ).findOneAndUpdate(
            { _id: ObjectId(req.params.id) },
            { $set: { password: hashpassword } }
          );
          if (update) {
            res.json({
              statusCode: 200,
              message: "Password changed successfully",
            });
          }
        }
      } else {
        res.json({
          statusCode: 403,
          message: "Details does not match",
        });
      }
    } else {
      res.json({
        statusCode: 404,
        message: "User does not exist",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      statusCode: 500,
      message: "internal server error",
    });
  } finally {
    await Client.close();
  }
});

router.listen(PORT, () => {
  console.log("Server running into port " + PORT);
});
