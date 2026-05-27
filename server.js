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
// SHOPIFY GRAPHQL HELPER
// ======================
async function shopifyQuery(query) {
  const response = await fetch(
    `https://${process.env.SHOPIFY_STORE}/admin/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query }),
    }
  );
  return response.json();
}


// ======================
// TAG ID SE RECORD DHUNDO
// ======================
async function findRecordByTagId(tagId) {
  const result = await shopifyQuery(`
    {
      metaobjects(type: "contact_form", first: 50) {
        edges {
          node {
            id
            fields { key value }
          }
        }
      }
    }
  `);

  const items = result.data.metaobjects.edges;

  const found = items.find((item) =>
    item.node.fields.some(
      (field) => field.key === "tag_id" && field.value === tagId
    )
  );

  if (!found) return null;

  const data = { _id: found.node.id };
  found.node.fields.forEach((field) => {
    data[field.key] = field.value;
  });

  return data;
}


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
    const record = await findRecordByTagId(tagId);
    if (record) return res.json({ found: true, data: record });
    res.json({ found: false });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});


// ======================
// VERIFY EDIT
// ======================
app.post("/verify-edit", async (req, res) => {
  console.log("Received:", req.body);
  const { tagId, email, password } = req.body;

  if (!tagId || !email || !password) {
    return res.status(400).json({ success: false, message: "Saari fields zaroori hain" });
  }

  try {
    const record = await findRecordByTagId(tagId);

    if (!record) {
      return res.json({ success: false, message: "Tag ID nahi mila" });
    }

    if (record.email !== email) {
      return res.json({ success: false, message: "Email ya password galat hai" });
    }

    const passwordMatch = await bcrypt.compare(password, record.password);
    if (!passwordMatch) {
      return res.json({ success: false, message: "Email ya password galat hai" });
    }

    return res.json({
      success: true,
      metaobjectId: record._id,
      user: {
        name: record.name || "",
        email: record.email || "",
        phone: record.phone || "",
        address: record.address || "",
        pet_name: record.pet_name || "",
      },
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ======================
// SUBMIT FORM (create + update)
// ======================
app.post("/submit-form", async (req, res) => {
  const { tagId, name, email, password, phone, address, petname, metaobjectId } = req.body;

  try {
    let result;

    if (metaobjectId) {
      // ---- UPDATE existing record ----
      console.log("Updating metaobject:", metaobjectId);

      // Agar password khali hai to purana wala rakhna hai
      // Pehle purana password fetch karo
      let finalHashedPassword;

      if (password && password.trim() !== "") {
        // Naya password diya — hash karo
        finalHashedPassword = await bcrypt.hash(password, 10);
        console.log("New password set");
      } else {
        // Password khali — purana fetch karo tagId se
        const existingRecord = await findRecordByTagId(tagId);
        finalHashedPassword = existingRecord?.password || "";
        console.log("Keeping old password");
      }

      result = await shopifyQuery(`
        mutation UpdateMetaobject {
          metaobjectUpdate(
            id: "${metaobjectId}"
            metaobject: {
              fields: [
                { key: "name",     value: "${name}" }
                { key: "email",    value: "${email}" }
                { key: "password", value: "${finalHashedPassword}" }
                { key: "phone",    value: "${phone}" }
                { key: "address",  value: "${address}" }
                { key: "pet_name", value: "${petname}" }
              ]
            }
          ) {
            metaobject { id }
            userErrors { field message }
          }
        }
      `);

    } else {
      // ---- CREATE new record ----
      console.log("Creating new metaobject for tagId:", tagId);

      if (!password || password.trim() === "") {
        return res.status(400).json({ error: "Naye registration ke liye password zaroori hai" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      result = await shopifyQuery(`
        mutation CreateMetaobject {
          metaobjectCreate(
            metaobject: {
              type: "contact_form"
              fields: [
                { key: "tag_id",   value: "${tagId}" }
                { key: "name",     value: "${name}" }
                { key: "email",    value: "${email}" }
                { key: "password", value: "${hashedPassword}" }
                { key: "phone",    value: "${phone}" }
                { key: "address",  value: "${address}" }
                { key: "pet_name", value: "${petname}" }
              ]
            }
          ) {
            metaobject { id }
            userErrors { field message }
          }
        }
      `);
    }

    console.log("Shopify result:", JSON.stringify(result));
    res.json(result);

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});


// ======================
// START SERVER
// ======================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});
