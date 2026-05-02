const multer = require("multer")


const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Only PDF resumes are supported right now. Please convert DOCX files to PDF before uploading."))
        }

        cb(null, true)
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
})


module.exports = upload
