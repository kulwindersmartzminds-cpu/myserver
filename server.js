import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.post("/submit-form", async (req, res) => {
  const { name, email, phone, address, petname } = req.body;

  try {
    const response = await fetch(
      `https://${process.env.SHOPIFY_STORE}/admin/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token":
            process.env.SHOPIFY_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          query: `
            mutation CreateMetaobject {
              metaobjectCreate(
                metaobject: {
                  type: "contact_form"
                  fields: [
                    {
                      key: "name"
                      value: "${name}"
                    }
                    {
                      key: "email"
                      value: "${email}"
                    }
                    {
                      key: "phone"
                      value: "${phone}"
                    }
                    {
                      key: "address"
                      value: "${address}"
                    }
                    {
                      key: "pet_name"
                      value: "${petname}"
                    }
                  ]
                }
              ) {
                metaobject {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `,
        }),
      }
    );

    const data = await response.json();

    res.json(data);

  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

app.listen(process.env.PORT, () => {
  console.log(
    `Server running on port ${process.env.PORT}`
  );
});