import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


// ======================
// SUBMIT FORM
// ======================
app.post("/submit-form", async (req, res) => {
  const { tagId, name, email, password, phone, address, petname } = req.body;

  try {
    // Password hash
    const hashedPassword = await bcrypt.hash(password, 10);

    const response = await fetch(
      `https://${process.env.SHOPIFY_STORE}/admin/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          query: `
            mutation CreateMetaobject {
              metaobjectCreate(
                metaobject: {
                  type: "contact_form"
                  fields: [
                    {
                      key: "tag_id"
                      value: "${tagId}"
                    }
                    {
                      key: "name"
                      value: "${name}"
                    }
                    {
                      key: "email"
                      value: "${email}"
                    }
                    {
                      key: "password"
                      value: "${hashedPassword}"
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


// ======================
// SERVER TEST
// ======================
app.get("/", (req, res) => {
  res.send("Server running");
});


// ======================
// CHECK TAG
// ======================
app.get("/check-tag/:tagId", async (req, res) => {
  const { tagId } = req.params;

  try {
    const response = await fetch(
      `https://${process.env.SHOPIFY_STORE}/admin/api/2025-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          query: `
          {
            metaobjects(type: "contact_form", first: 50) {
              edges {
                node {
                  fields {
                    key
                    value
                  }
                }
              }
            }
          }
          `,
        }),
      }
    );

    const result = await response.json();

    const items = result.data.metaobjects.edges;

    const found = items.find((item) =>
      item.node.fields.some(
        (field) =>
          field.key === "tag_id" &&
          field.value === tagId
      )
    );

    if (found) {
      const data = {};

      found.node.fields.forEach((field) => {
        data[field.key] = field.value;
      });

      return res.json({
        found: true,
        data,
      });
    }

    res.json({
      found: false,
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});


// ======================
// START SERVER
// ======================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});