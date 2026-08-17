const express = require("express");
const multer = require("multer");
const orders = require("./data"); // Shared order array

module.exports = (io) => {
  const router = express.Router();

  // Store uploaded PDFs in memory (change to diskStorage if needed)
  const storage = multer.memoryStorage();
  const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB per file
    fileFilter: (req, file, cb) => {
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed!"));
      }
    }
  });

  // ✅ Handle print order submission
  router.post("/print-order", upload.array("pdfs"), (req, res) => {
    try {
      const { name, email, pages, total } = req.body;
      const files = req.files;

      if (!name || !email || !pages || !total || !files || files.length === 0) {
        return res.status(400).send("Missing fields or no files uploaded.");
      }

      const order = {
        name,
        email,
        items: [
          {
            name: "Printing Services",
            quantity: parseInt(pages),
            price: 2 // ₹2 per page
          }
        ],
        total: parseFloat(total),
        time: new Date().toLocaleString(),
        type: "print",
        files: files.map(file => file.originalname)
      };

      orders.push(order);
      console.log("Print order received:", order);

      // ✅ Notify admin dashboard
      io.emit("new-order", order);

      res.status(200).json({ message: "Print order submitted successfully!", order });

    } catch (error) {
      console.error("Print order error:", error.message);
      res.status(500).send("Server error while submitting print order.");
    }
  });

  // (Optional) Fetch only print orders
  router.get("/print-orders", (req, res) => {
    res.json(orders.filter(order => order.type === "print"));
  });

  return router;
};
