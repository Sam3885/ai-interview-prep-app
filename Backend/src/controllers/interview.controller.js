const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")
const mongoose = require("mongoose")
const { z } = require("zod")

const memoryReports = new Map()

function isDatabaseConnected() {
    return mongoose.connection.readyState === 1
}

function createFallbackReport({ userId, resume, selfDescription, jobDescription }) {
    const now = new Date()
    const titleMatch = jobDescription.match(/(?:role|position|title|job)\s*:?\s*([^\n.]+)/i)
    const title = titleMatch?.[ 1 ]?.trim() || "Target Role"

    return {
        _id: Date.now().toString(),
        user: userId,
        resume,
        selfDescription,
        jobDescription,
        matchScore: 72,
        title,
        technicalQuestions: [
            {
                question: "Which parts of your experience best match this role?",
                intention: "Checks whether you can map your background to the job requirements.",
                answer: "Connect two or three recent projects to the role's main skills, then explain the impact you delivered."
            },
            {
                question: "How would you approach the hardest technical requirement in this job description?",
                intention: "Evaluates problem solving and depth in the role's core technology area.",
                answer: "Break the requirement into constraints, tradeoffs, implementation steps, and how you would validate the result."
            }
        ],
        behavioralQuestions: [
            {
                question: "Tell me about a time you learned something quickly for a project.",
                intention: "Looks for adaptability and ownership.",
                answer: "Use a STAR structure: situation, task, action, and result. Emphasize how you reduced uncertainty."
            },
            {
                question: "Describe a time you handled feedback or a change in direction.",
                intention: "Tests collaboration and resilience.",
                answer: "Show that you listened, clarified expectations, adjusted your plan, and improved the outcome."
            }
        ],
        skillGaps: [
            { skill: "Job-specific examples", severity: "medium" },
            { skill: "Metrics and impact", severity: "low" }
        ],
        preparationPlan: [
            { day: 1, focus: "Role alignment", tasks: [ "Highlight matching resume projects", "Prepare a concise introduction" ] },
            { day: 2, focus: "Technical practice", tasks: [ "Review the job's top technical requirements", "Prepare two project deep dives" ] },
            { day: 3, focus: "Mock interview", tasks: [ "Practice behavioral answers", "Refine questions for the interviewer" ] }
        ],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
    }
}

const generateReportSchema = z.object({
    jobDescription: z.string().trim().min(30, "Job description should be at least 30 characters"),
    selfDescription: z.string().trim().max(3000, "Self description must be under 3000 characters").optional().default("")
})


/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {

    try {
        const parsedBody = generateReportSchema.safeParse(req.body)

        if (!parsedBody.success) {
            return res.status(400).json({
                message: parsedBody.error.issues[ 0 ].message
            })
        }

        const { selfDescription, jobDescription } = parsedBody.data

        if (!req.file && !selfDescription.trim()) {
            return res.status(400).json({
                message: "Please upload a PDF resume or add a self description"
            })
        }

        let resumeText = ""

        if (req.file) {
            try {
                const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
                resumeText = resumeContent.text
            } catch (error) {
                if (!selfDescription.trim()) {
                    return res.status(400).json({
                        message: "Could not read this PDF. Please upload a text-based PDF or add a self description."
                    })
                }
            }
        }

        if (!process.env.GOOGLE_GENAI_API_KEY || !isDatabaseConnected()) {
            const interviewReport = createFallbackReport({
                userId: req.user.id,
                resume: resumeText,
                selfDescription,
                jobDescription
            })

            memoryReports.set(interviewReport._id, interviewReport)

            return res.status(201).json({
                message: "Interview report generated successfully.",
                interviewReport
            })
        }

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription,
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription,
            jobDescription,
            ...interViewReportByAi
        })

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (error) {
        res.status(400).json({
            message: error.message || "Unable to process resume"
        })
    }

}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    if (!isDatabaseConnected()) {
        const interviewReport = memoryReports.get(interviewId)

        if (!interviewReport || interviewReport.user !== req.user.id) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        return res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })
    }

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    if (!isDatabaseConnected()) {
        const interviewReports = [ ...memoryReports.values() ]
            .filter(report => report.user === req.user.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        return res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        })
    }

    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findById(interviewReportId)

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }
