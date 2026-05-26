import express from "express";
import cors from "cors";
import dotenv from "dotenv";
const PORT = process.env.PORT || 5000;
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.post("/submit-form", async (req, res) => {
  const { tagId, name, email, password, phone, address, petname } = req.body;

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
                    value: "${password}"
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
app.get("/", (req, res) => {
  res.send("Server running");
});


app.get("/check-tag/:tagId", async (req, res) => {

  const { tagId } = req.params;

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
          `
        }),
      }
    );

    const result = await response.json();

    const items = result.data.metaobjects.edges;

    const found = items.find((item) => {

      return item.node.fields.some(
        (field) =>
          field.key === "tag_id" &&
          field.value === tagId
      );

    });


    // MATCH MIL GAYA
    if (found) {

      const data = {};

      found.node.fields.forEach((field) => {
        data[field.key] = field.value;
      });

      return res.json({
        found: true,
        data
      });

    }
    // MATCH NAHI MILA
    res.json({
      found: false
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});

