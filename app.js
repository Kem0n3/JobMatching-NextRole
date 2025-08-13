require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const flash = require('connect-flash');

const JobSeekerProfile = require('./models/JobSeekerProfile');
const Application = require('./models/Application');
const JobPosting = require('./models/JobPosting');

const { calculateOverallMatchScore } = require('./services/matchingService');
const { addSeekerProfileData, calculateProfileCompletionPercentage } = require('./middleware/profileDataMiddleware');
const { ensureAuthenticated } = require('./middleware/authMiddleware');

const authRoutes = require('./routes/auth');
const seekerProfileRoutes = require('./routes/seekerProfile');
const jobPostingRoutes = require('./routes/jobPosting');
const matchesRoutes = require('./routes/matches');
const applicationRoutes = require('./routes/applicationRoutes');
const browseRoutes = require('./routes/browseRoutes');

const {
    skillsList, degreeLevelsList, fieldsOfStudyList,
    locationsList, broaderCategoriesList, jobTypeList, careerLevelsList
} = require('./config/selectData');

const app = express();

require('./config/passport')(passport);

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected...'))
.catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'a_very_secret_key_for_dev_sessions',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(addSeekerProfileData);

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.currentUser = req.user;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

app.use('/auth', authRoutes);
app.use('/profile', seekerProfileRoutes);
app.use('/jobs', jobPostingRoutes);
app.use('/matches', matchesRoutes);
app.use('/applications', applicationRoutes);
app.use('/browse', browseRoutes);

app.get('/', (req, res) => {
    res.render('index', {
        title: 'Welcome',
        activeNavItem: 'home'
    });
});

app.get('/dashboard', ensureAuthenticated, async (req, res, next) => {
    const commonViewData = {
        activeNavItem: 'dashboard',
        skillsList, locationsList, jobTypeList, degreeLevelsList, fieldsOfStudyList, broaderCategoriesList, careerLevelsList
    };

    if (req.user.role === 'seeker') {
        try {
            const seekerProfile = await JobSeekerProfile.findOne({ user_id: req.user.id });

            const activeAppsPromise = Application.countDocuments({ seeker_user_id: req.user.id, status: { $nin: ['Hired', 'Rejected', 'Withdrawn'] }});
            const offersHiredAppsPromise = Application.countDocuments({ seeker_user_id: req.user.id, status: { $in: ['Offered', 'Hired'] }});

            let matchedJobs = [];
            let matchedJobsCount = 0;
            if (seekerProfile) {
                const allActiveJobs = await JobPosting.find({ isActive: true }).populate('recruiter_id', 'companyName');
                const applicationsForJobs = await Application.find({ seeker_user_id: req.user.id }).select('job_id -_id');
                const appliedJobIds = applicationsForJobs.map(app => app.job_id.toString());

                for (const job of allActiveJobs) {
                    const score = calculateOverallMatchScore(seekerProfile, job);
                    if (score > 0.3) {
                        matchedJobs.push({ ...job.toObject(), matchScore: score, hasApplied: appliedJobIds.includes(job._id.toString()) });
                    }
                }
                matchedJobs.sort((a, b) => b.matchScore - a.matchScore);
                matchedJobsCount = matchedJobs.length;
            }

            const recentApplicationsPromise = Application.find({ seeker_user_id: req.user.id })
                .populate({ path: 'job_id', select: 'jobTitle companyName _id isActive' })
                .sort({ applicationDate: -1 })
                .limit(5);
            const allMyAppsPromise = Application.find({ seeker_user_id: req.user.id });

            const [activeApplicationsCount, offersOrHiredCount, recentApplications, allMyApps] = await Promise.all([
                activeAppsPromise, offersHiredAppsPromise, recentApplicationsPromise, allMyAppsPromise
            ]);

            const applicationStatusCounts = {};
            const statusOrder = ['Applied', 'Viewed', 'Under Review', 'Interviewing', 'Offered', 'Hired', 'Rejected', 'Withdrawn'];
            const statusColorsHex = { Applied: '#3F72AF', Viewed: '#FFCA28', UnderReview: '#FFCA28', Interviewing: '#17A2B8', Offered: '#66BB6A', Hired: '#28a745', Rejected: '#F05454', Withdrawn: '#B0BEC5' };

            statusOrder.forEach(status => {
                const count = allMyApps.filter(app => app.status === status).length;
                if (count > 0 || status === 'Applied') {
                     applicationStatusCounts[status] = {
                        count: count,
                        percentage: allMyApps.length > 0 ? Math.round((count / allMyApps.length) * 100) : 0,
                        color: statusColorsHex[status] || '#CFD8DC',
                        label: status
                    };
                }
            });

            res.render('dashboard/seekerDashboard', {
                ...commonViewData,
                title: 'Seeker Dashboard',
                activeApplicationsCount,
                offersOrHiredCount,
                matchedJobsCount,
                recommendedJobs: matchedJobs.slice(0, 3),
                recentApplications: recentApplications.map(app => app.toObject()),
                applicationStatusCounts,
            });
        } catch (error) {
            console.error("Error loading seeker dashboard data:", error);
            next(error);
        }
    } else if (req.user.role === 'recruiter') {
        try {
            const jobsPostedCountPromise = JobPosting.countDocuments({ recruiter_id: req.user.id });
            const activeJobsCountPromise = JobPosting.countDocuments({ recruiter_id: req.user.id, isActive: true });
            const myJobsForAppCount = await JobPosting.find({ recruiter_id: req.user.id }).select('_id');
            const myJobIds = myJobsForAppCount.map(job => job._id);
            const totalApplicantsPromise = Application.countDocuments({ job_id: { $in: myJobIds } });
            const today = new Date();
            today.setHours(0,0,0,0);
            const newApplicationsTodayPromise = Application.countDocuments({ job_id: { $in: myJobIds }, applicationDate: { $gte: today } });
            const recentJobsPromise = JobPosting.find({ recruiter_id: req.user.id }).sort({ postedDate: -1 }).limit(5);

            const [jobsPostedCount, activeJobsCount, totalApplicants, newApplicationsToday, recentJobs] = await Promise.all([
                jobsPostedCountPromise, activeJobsCountPromise, totalApplicantsPromise, newApplicationsTodayPromise, recentJobsPromise
            ]);

            res.render('dashboard/recruiterDashboard', {
                ...commonViewData,
                title: 'Recruiter Dashboard',
                jobsPostedCount,
                activeJobsCount,
                totalApplicants,
                newApplicationsToday,
                recentJobs: recentJobs.map(job => job.toObject())
            });
        } catch (error) {
            console.error("Error loading recruiter dashboard data:", error);
            next(error);
        }
    } else {
        res.render('dashboard/generalDashboard', {
             ...commonViewData,
             title: 'Dashboard'
        });
    }
});

app.use((req, res, next) => {
    console.log(`404 Not Found for URL: ${req.originalUrl}`);
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'Sorry, the page you are looking for does not exist.',
        activeNavItem: 'error'
    });
});

app.use((err, req, res, next) => {
    console.error("Global Error Handler Caught:", err.stack);
    const statusCode = err.status || 500;
    res.status(statusCode);
    res.render('error', {
        title: `Error ${statusCode}`,
        message: (process.env.NODE_ENV === 'development' || statusCode < 500) ? err.message : 'Something went wrong on our end!',
        error: process.env.NODE_ENV === 'development' ? err : {},
        activeNavItem: 'error'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));