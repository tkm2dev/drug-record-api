const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

class PDFGenerator {
  static async generate(data) {
    try {
      const doc = new PDFDocument({
        size: "A4",
        font: path.join(__dirname, "../fonts/THSarabunNew.ttf"), // ต้องมีฟอนต์ไทยในระบบ
        margin: 40,
      });

      // สร้างชื่อไฟล์และ path
      const fileName = `drug_record_${data.record_number}.pdf`;
      const filePath = path.join(__dirname, "../uploads/pdf", fileName);

      // สร้างโฟลเดอร์ถ้ายังไม่มี
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      // สร้าง write stream
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // เริ่มสร้าง PDF
      this.generateHeader(doc);
      this.generateContent(doc, data);
      this.generateFooter(doc, data);

      // จบการสร้าง PDF
      doc.end();

      // รอให้เขียนไฟล์เสร็จ
      return new Promise((resolve, reject) => {
        stream.on("finish", () => resolve(filePath));
        stream.on("error", reject);
      });
    } catch (error) {
      throw new Error(`Error generating PDF: ${error.message}`);
    }
  }

  static generateHeader(doc) {
    doc
      .fontSize(20)
      .font("THSarabunNew-Bold")
      .text("แบบซักถาม", { align: "center" })
      .moveDown();

    doc
      .fontSize(16)
      .font("THSarabunNew")
      .text("ข้อมูลผู้เกี่ยวข้องกับยาเสพติด", { align: "center" })
      .moveDown();
  }

  static generateContent(doc, data) {
    doc.fontSize(14);

    // 1. ข้อมูลส่วนตัว
    doc
      .text("1. เป้าหมาย", { continued: true })
      .text(`ชื่อ ${data.first_name || "............................."} `, {
        continued: true,
      })
      .text(`สกุล ${data.last_name || "............................."} `, {
        continued: true,
      })
      .text(`อายุ ${data.age || "........"} ปี`);

    doc.text(
      `หมายเลขบัตรประชาชน ${
        data.id_card || ".................................."
      }`
    );

    doc
      .text(`บ้านเลขที่ ${data.house_no || "........"} `, { continued: true })
      .text(`หมู่ที่ ${data.moo || "........"} `, { continued: true })
      .text(`ตำบล ${data.tambon || "........................"} `, {
        continued: true,
      })
      .text(`อำเภอ ${data.amphoe || "ธวัชบุรี"} `, { continued: true })
      .text(`จังหวัด ${data.province || "ร้อยเอ็ด"}`);

    doc.moveDown();

    // 2. ประวัติการใช้ยา
    doc
      .text("2. เคยเสพยาเสพติดหรือไม่", { continued: true })
      .text(` ${data.has_used_drugs ? "☒ เคย" : "☐ เคย"}`, { continued: true })
      .text(` ${!data.has_used_drugs ? "☒ ไม่เคย" : "☐ ไม่เคย"}`);

    doc.moveDown();

    // 3. รายละเอียดการใช้ยา
    if (data.has_used_drugs) {
      doc.text("3. กรณีเคยเสพยาเสพติด");

      // 3.1 ประเภทยา
      doc.text("3.1 เสพยาเสพติดประเภท");
      const drugTypes = data.drug_types || [];
      doc
        .text(`☐ ยาบ้า ${drugTypes.includes("ยาบ้า") ? "☒" : "☐"}`, {
          continued: true,
        })
        .text(` ยาไอซ์ ${drugTypes.includes("ยาไอซ์") ? "☒" : "☐"}`, {
          continued: true,
        })
        .text(
          ` อื่นๆ ${
            drugTypes.some((type) => !["ยาบ้า", "ยาไอซ์"].includes(type))
              ? "☒"
              : "☐"
          }`
        );

      // 3.2 วันที่เริ่มเสพ
      doc.text(
        `3.2 เริ่มเสพเมื่อ ${
          data.start_date || "................................."
        }`
      );

      // 3.3 แรงจูงใจ
      doc.text("3.3 แรงจูงใจในการเสพยาเสพติด");
      const reasons = data.reasons || [];
      doc
        .text(`อยากลอง ${reasons.includes("อยากลอง") ? "☒" : "☐"}`, {
          continued: true,
        })
        .text(` เพื่อนชวน ${reasons.includes("เพื่อนชวน") ? "☒" : "☐"}`);
      doc
        .text(
          `ต้องการทำงานได้มากขึ้น ${
            reasons.includes("ต้องการทำงานได้มากขึ้น") ? "☒" : "☐"
          }`,
          { continued: true }
        )
        .text(` ถูกบังคับ ${reasons.includes("ถูกบังคับ") ? "☒" : "☐"}`);

      // 3.4 ปริมาณการใช้
      if (data.usage) {
        doc.text(
          `3.4 การใช้ยาเสพติด จำนวนที่เสพแต่ละครั้ง ${
            data.usage.amountPerTime || "........"
          } เม็ด`
        );
        doc
          .text("ระยะในการเสพ", { continued: true })
          .text(` เดือนละ ${data.usage.frequency || "........"} ครั้ง`);
      }

      // 3.5 ข้อมูลการใช้ครั้งล่าสุด
      if (data.lastUsage) {
        doc.text("3.5 เสพยาเสพติดครั้งสุดท้าย");
        doc
          .text(`ประเภท ${data.lastUsage.type || "................"}`, {
            continued: true,
          })
          .text(
            ` เมื่อวันที่ ${data.lastUsage.date || "..................."}`,
            { continued: true }
          )
          .text(` เวลา ${data.lastUsage.time || ".........."} น.`, {
            continued: true,
          })
          .text(` จำนวน ${data.lastUsage.amount || "........"} เม็ด`);

        // ข้อมูลผู้ขาย
        if (data.lastDealer) {
          doc.text("ข้อมูลผู้ขาย:");
          doc
            .text(`ชื่อ ${data.lastDealer.firstName || "................"}`, {
              continued: true,
            })
            .text(` สกุล ${data.lastDealer.lastName || "................"}`, {
              continued: true,
            })
            .text(
              ` ชื่อเล่น ${data.lastDealer.nickname || "................"}`
            );
          doc
            .text(
              `ราคาเม็ดละ ${data.lastDealer.pricePerUnit || "........"} บาท`,
              { continued: true }
            )
            .text(
              ` รวมเป็นเงิน ${data.lastDealer.totalPrice || "........"} บาท`
            );
        }

        // ข้อมูลการติดต่อ
        if (data.contact) {
          doc.text("3.6 ติดต่อกับผู้ขายโดย:");
          doc.text("เบอร์โทรศัพท์:");
          doc.text(`- ผู้เสพ: ${data.contact.userPhone || "................"}`);
          doc.text(
            `- ผู้ขาย: ${data.contact.dealerPhone || "................"}`
          );

          doc.text("LINE ID:");
          doc.text(`- ผู้เสพ: ${data.contact.userLine || "................"}`);
          doc.text(
            `- ผู้ขาย: ${data.contact.dealerLine || "................"}`
          );

          doc.text("Facebook:");
          doc.text(
            `- ผู้เสพ: ${data.contact.userFacebook || "................"}`
          );
          doc.text(
            `- ผู้ขาย: ${data.contact.dealerFacebook || "................"}`
          );
        }

        // ข้อมูลการชำระเงิน
        if (data.payment) {
          doc.text("3.7 ชำระเงินค่ายาเสพติด:");
          doc.text(
            `☐ ชำระเป็นเงินสด ${data.payment.method === "cash" ? "☒" : "☐"}`
          );

          if (data.payment.method === "bank_transfer") {
            doc.text("☒ โดยการโอนเงินผ่านบัญชี");
            doc.text(
              `- บัญชีผู้โอน: ${data.payment.senderBank || "................"}`
            );
            doc.text(
              `  เลขที่บัญชี: ${
                data.payment.senderAccount || "................"
              }`
            );
            doc.text(
              `- บัญชีผู้รับโอน: ${
                data.payment.receiverBank || "................"
              }`
            );
            doc.text(
              `  เลขที่บัญชี: ${
                data.payment.receiverAccount || "................"
              }`
            );
          }
        }
      }
    }
  }

  static generateFooter(doc, data) {
    doc.moveDown(2);

    // ลายเซ็นผู้ให้ข้อมูลและผู้ซักถาม
    doc.text("ลงชื่อ .................................. ผู้ให้ข้อมูล", {
      align: "left",
    });
    doc.moveDown();
    doc.text("ลงชื่อ .................................. ผู้ซักถาม", {
      align: "left",
    });

    // วันที่บันทึก
    const recordDate = data.record_date
      ? new Date(data.record_date).toLocaleDateString("th-TH")
      : "";
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`บันทึกเมื่อวันที่ ${recordDate}`, { align: "right" });
  }
}

module.exports = PDFGenerator;
