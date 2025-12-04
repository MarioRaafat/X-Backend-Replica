export const Y_LOGO_URL =
    'https://yapperdev.blob.core.windows.net/profile-images/25a3ccdd-0437-4e88-9bcb-028f1de2d7c4-1763920269595-Y_Logo.jpg';
export const Y_LOGO_HOST_URL = 'https://yapperdev.blob.core.windows.net/profile-images/';

export const STRING_MAX_LENGTH = 100;
export const LARGE_MAX_LENGTH = 3000;
export const POST_CONTENT_LENGTH = 280;
export const MESSAGE_CONTENT_LENGTH = 300;
export const OTP_LENGTH = 6;

// ------------------------- Email Templates ------------------------- //
export const verification_email_object = (otp: string, link: string) => ({
    subject: `${otp} is your Y verification code`,
    title: 'Confirm your email address',
    description: 'Please enter this verification code to get started on Yapper:',
    subtitle: 'Getting a lot of emails?',
    subtitle_description: `
        If you feel this is not your account or you didn't request this, you can let us know by clicking
            <a href=${link} 
                title="click here to report it"
                style="color: #1d9bf0; text-decoration: none;"
                target="_blank">Not my account</a>.
    `,
});

export const reset_password_email_object = (username: string) => ({
    subject: 'Password reset request',
    title: 'Reset your password?',
    description: `If you requested a password reset for @${username}, use the confirmation code below to complete the process. If you didn't make this request, ignore this email.`,
    subtitle: '',
    subtitle_description: ``,
});

// ------------------------- Test Data for Testing Team ------------------------- //
export class TestDataConstants {
    static readonly TEST_USERS = [
        {
            email: 'mario@yapper.test',
            password: 'mario123#',
            name: 'Mario Raafat',
            username: 'mario_rafat12956014',
            birth_date: new Date('2004-05-22'),
            language: 'en' as const,
            avatar_url:
                'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764833843259-2.jpg',
        },
        {
            email: 'mohsen@yapper.test',
            password: 'mohsen123#',
            name: 'Kero Mohsen',
            username: 'kero_mohsen239609562',
            birth_date: new Date('2005-03-03'),
            language: 'en' as const,
            avatar_url:
                'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764833909851-1.jpg',
        },
        {
            email: 'esraa@yapper.test',
            password: 'esraa123#',
            name: 'Esraa Hassan',
            username: 'esraa_hassan7890560',
            birth_date: new Date('2004-09-10'),
            language: 'en' as const,
            avatar_url:
                'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764833566699-esraa.jpg',
        },
        {
            email: 'salah@yapper.test',
            password: 'test123#',
            name: 'Mo Salah',
            username: 'mo_salah4567890',
            birth_date: new Date('2003-03-15'),
            language: 'en' as const,
        },
        {
            email: 'messi@yapper.test',
            password: 'test123#',
            name: 'Lionel Messi',
            username: 'lionel_messi8901234',
            birth_date: new Date('2002-07-28'),
            language: 'en' as const,
        },
        {
            email: 'afsha@yapper.test',
            password: 'test123#',
            name: 'Magdy Afsha',
            username: 'magdy_afsha2345678',
            birth_date: new Date('2001-11-05'),
            language: 'en' as const,
        },
        {
            email: '7amada@yapper.test',
            password: 'test123#',
            name: '7amada ElSawy',
            username: '7amada_elsawy6789012',
            birth_date: new Date('2004-02-14'),
            language: 'en' as const,
        },
        {
            email: '3m_3abdo@yapper.test',
            password: 'test123#',
            name: '3m 3abdo',
            username: '3m_3abdo3456789',
            birth_date: new Date('2003-08-19'),
            language: 'en' as const,
        },
        {
            email: 'liverpool@yapper.test',
            password: 'test123#',
            name: 'Liverpool FC',
            username: 'liverpool_fc9012345',
            birth_date: new Date('2002-12-30'),
            language: 'en' as const,
        },
        {
            email: 'yapper@yapper.test',
            password: 'test123#',
            name: 'yapper Dev',
            username: 'yapper_dev7890123',
            birth_date: new Date('2001-04-22'),
            language: 'en' as const,
            avatar_url: Y_LOGO_URL,
        },
    ];

    static readonly TEST_TWEETS = [
        {
            user_index: 0, // Mario - 20 tweets (5 with images)
            tweets: [
                {
                    content:
                        'Building the backend for our new social platform! 🚀 #development #coding',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764832739993-code.jpg',
                    ],
                },
                {
                    content:
                        'Just finished implementing the authentication system 💻 #nodejs #nestjs',
                    images: [],
                },
                {
                    content:
                        'Working on optimizing database queries today #postgresql #performance',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764832769559-postgres.png',
                    ],
                },
                { content: 'Coffee and code - the perfect combination ☕ #developer', images: [] },
                {
                    content: 'Debugging is like being a detective in a crime movie 🔍 #debugging',
                    images: [],
                },
                {
                    content: 'Finally got the WebSocket implementation working! #realtime #chat',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764832792587-chat.png',
                    ],
                },
                {
                    content: 'Testing team is doing an amazing job finding edge cases 🎯 #testing',
                    images: [],
                },
                {
                    content: 'Learning new TypeScript patterns every day 📚 #typescript',
                    images: [],
                },
                {
                    content: 'Code review time! Love seeing clean code 👌 #cleancode',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764832811767-clean%20code.jpg',
                    ],
                },
                {
                    content: 'Docker containers make deployment so much easier 🐳 #docker',
                    images: [],
                },
                {
                    content: 'Working late tonight to meet the sprint deadline 🌙 #agile',
                    images: [],
                },
                {
                    content: 'Redis caching improved our API response time by 60%! 🚀 #redis',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764832827804-redis.png',
                    ],
                },
                {
                    content: 'Pair programming session was very productive today 👥 #teamwork',
                    images: [],
                },
                { content: 'Writing unit tests for the new features #tdd #testing', images: [] },
                { content: 'API documentation is finally complete 📖 #swagger', images: [] },
                { content: 'Refactored the entire user module today #refactoring', images: [] },
                { content: 'CI/CD pipeline is running smoothly now ✅ #devops', images: [] },
                {
                    content:
                        'Microservices architecture is challenging but rewarding 🏗️ #microservices',
                    images: [],
                },
                { content: 'Backend development is my passion 💙 #backend', images: [] },
                { content: 'Looking forward to the next sprint planning 📊 #scrum', images: [] },
            ],
        },
        {
            user_index: 1, // Mohsen - 20 tweets (5 with images)
            tweets: [
                {
                    content: 'Frontend development is so exciting! 🎨 #frontend #react',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764832864027-react.png',
                    ],
                },
                {
                    content: 'Just created an awesome UI component library 🔥 #components',
                    images: [],
                },
                { content: 'CSS Grid and Flexbox make layouts so easy #css #webdev', images: [] },
                {
                    content: 'Responsive design is not optional anymore 📱 #responsive',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764832878177-responsive.jpg',
                    ],
                },
                { content: 'State management with Redux is powerful 💪 #redux', images: [] },
                { content: 'Animations bring life to the UI ✨ #animations', images: [] },
                {
                    content: 'Testing React components with Jest #testing #jest',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764832943690-jest.png',
                    ],
                },
                { content: 'Dark mode implementation complete 🌙 #darkmode', images: [] },
                { content: 'Performance optimization is crucial for UX #performance', images: [] },
                {
                    content: 'Accessibility matters! Making the web for everyone ♿ #a11y',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764832959642-a11y.png',
                    ],
                },
                { content: 'Working on the mobile version of our app 📱 #mobile', images: [] },
                {
                    content: 'TypeScript makes React development much better 🎯 #typescript',
                    images: [],
                },
                {
                    content: 'Figma designs are pixel perfect today! 🎨 #figma',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764832974452-figma.jpg',
                    ],
                },
                { content: 'Learning Next.js for SSR capabilities #nextjs #ssr', images: [] },
                { content: 'Web performance audits show great results 📊 #lighthouse', images: [] },
                { content: 'Custom hooks make code so reusable ♻️ #hooks', images: [] },
                { content: 'Styled components vs CSS modules debate 🤔 #styling', images: [] },
                { content: 'Progressive Web Apps are the future 🚀 #pwa', images: [] },
                { content: 'Browser compatibility testing is done ✅ #compatibility', images: [] },
                { content: 'Love working with this amazing team! 💙 #teamwork', images: [] },
            ],
        },
        {
            user_index: 2, // Esraa - 20 tweets (5 with images)
            tweets: [
                {
                    content: 'Quality assurance is the backbone of great software 🛡️ #qa #testing',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764832998278-qa.jpg',
                    ],
                },
                { content: 'Found and reported 15 bugs today 🐛 #bugbounty', images: [] },
                { content: 'Automation testing saves so much time ⏰ #automation', images: [] },
                {
                    content: 'Test cases are ready for the new sprint 📝 #testcases',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764833041278-testcases.png',
                    ],
                },
                {
                    content: 'Performance testing shows excellent results 📈 #performance',
                    images: [],
                },
                { content: 'Security testing is critical for user trust 🔒 #security', images: [] },
                {
                    content: 'Regression testing complete, all green! ✅ #regression',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764833087283-regression.png',
                    ],
                },
                {
                    content: 'Creating comprehensive test documentation 📚 #documentation',
                    images: [],
                },
                { content: 'API testing with Postman is so efficient 🚀 #postman', images: [] },
                {
                    content: 'Load testing revealed some bottlenecks ⚠️ #loadtesting',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764833059049-loadtesting.png',
                    ],
                },
                { content: 'User acceptance testing phase begins tomorrow 👥 #uat', images: [] },
                { content: 'Cross-browser testing is essential #browsers', images: [] },
                {
                    content: 'Mobile app testing on different devices 📱 #mobiletesting',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764833074880-mobiletesting.jpg',
                    ],
                },
                {
                    content: 'Writing detailed bug reports for the dev team 📋 #bugreports',
                    images: [],
                },
                { content: 'Test automation framework is ready 🤖 #framework', images: [] },
                { content: 'Edge case testing reveals the best bugs 🔍 #edgecases', images: [] },
                {
                    content: 'Integration testing between modules complete ✅ #integration',
                    images: [],
                },
                { content: 'Quality metrics looking great this sprint 📊 #metrics', images: [] },
                { content: 'Continuous testing in the CI/CD pipeline 🔄 #cicd', images: [] },
                {
                    content: "Testing is not just finding bugs, it's ensuring quality 🎯 #quality",
                    images: [],
                },
            ],
        },
        {
            user_index: 3,
            tweets: [
                {
                    content:
                        'Good morning everyone! Starting a new day with fresh coffee ☕ #morning',
                    images: [],
                },
                { content: 'Learning new technologies every day 📚 #learning', images: [] },
                { content: 'Excited about the new project features 🚀 #excited', images: [] },
                {
                    content: 'Team collaboration makes everything better 👥 #collaboration',
                    images: [],
                },
                { content: 'Looking forward to the weekend! 🎉 #weekend', images: [] },
            ],
        },
        {
            user_index: 4,
            tweets: [
                { content: 'Data analysis reveals interesting patterns 📊 #data', images: [] },
                { content: 'Working on improving system performance ⚡ #optimization', images: [] },
                { content: 'Documentation is finally up to date 📝 #docs', images: [] },
                { content: 'Code reviews help us all grow 🌱 #growth', images: [] },
                { content: "Great discussion in today's stand-up meeting 💬 #standup", images: [] },
            ],
        },
        {
            user_index: 5,
            tweets: [
                { content: 'DevOps practices improving our workflow 🔄 #devops', images: [] },
                { content: 'Infrastructure as code is amazing 🏗️ #iac', images: [] },
                { content: 'Monitoring and logging setup complete 📡 #monitoring', images: [] },
                { content: 'Deployment automation saves hours of work ⏰ #automation', images: [] },
                {
                    content: 'System reliability is at an all-time high 📈 #reliability',
                    images: [],
                },
            ],
        },
        {
            user_index: 6,
            tweets: [
                { content: 'UI/UX design principles guide everything we build 🎨 #ux', images: [] },
                {
                    content: 'User feedback is invaluable for improvements 💭 #feedback',
                    images: [],
                },
                { content: 'Wireframes are ready for review 📐 #wireframes', images: [] },
                { content: 'Design system consistency is key 🔑 #designsystem', images: [] },
                { content: 'A/B testing results are in! 📊 #abtesting', images: [] },
            ],
        },
        {
            user_index: 7,
            tweets: [
                { content: 'Database optimization improved query speed 🚀 #database', images: [] },
                { content: 'Data modeling for the new features 📊 #datamodeling', images: [] },
                { content: 'Backup and recovery procedures tested ✅ #backup', images: [] },
                { content: 'Indexing strategies make a huge difference 📈 #indexing', images: [] },
                { content: 'Database migrations went smoothly 🔄 #migrations', images: [] },
            ],
        },
        {
            user_index: 8,
            tweets: [
                {
                    content: 'Project management tools keep us organized 📋 #projectmanagement',
                    images: [],
                },
                { content: 'Sprint planning complete for next iteration 🎯 #sprint', images: [] },
                { content: 'Team velocity is improving each sprint 📈 #velocity', images: [] },
                { content: 'Stakeholder meeting went really well 🤝 #stakeholders', images: [] },
                { content: 'Release planning for the next quarter 📅 #release', images: [] },
            ],
        },
        {
            user_index: 9,
            tweets: [
                { content: 'Cloud architecture design is fascinating ☁️ #cloud', images: [] },
                {
                    content: 'Serverless functions reduce operational overhead 🚀 #serverless',
                    images: [],
                },
                { content: 'Container orchestration with Kubernetes 🎯 #kubernetes', images: [] },
                { content: 'Scaling strategies for high traffic 📈 #scaling', images: [] },
                { content: 'Multi-region deployment complete 🌍 #deployment', images: [] },
            ],
        },
    ];

    // Replies data structure for main 3 users
    static readonly TEST_REPLIES = [
        {
            replier_index: 0,
            original_user_index: 1,
            original_tweet_index: 0,
            reply: 'Awesome work on the frontend! The UI looks amazing! 🎉',
        },
        {
            replier_index: 1,
            original_user_index: 0,
            original_tweet_index: 0,
            reply: 'Thanks! Backend APIs are super fast, great job! 💪',
        },
        {
            replier_index: 2,
            original_user_index: 0,
            original_tweet_index: 1,
            reply: 'Tested the auth system thoroughly, works perfectly! ✅',
        },
        {
            replier_index: 0,
            original_user_index: 2,
            original_tweet_index: 0,
            reply: 'Your testing found some critical bugs, really appreciate it! 🙏',
        },
        {
            replier_index: 1,
            original_user_index: 2,
            original_tweet_index: 3,
            reply: 'Those bug reports were so detailed and helpful! 📝',
        },
        {
            replier_index: 2,
            original_user_index: 1,
            original_tweet_index: 2,
            reply: 'CSS Grid implementation is flawless on all browsers! 🎯',
        },
        {
            replier_index: 0,
            original_user_index: 1,
            original_tweet_index: 4,
            reply: 'Redux setup is clean and maintainable! 👌',
        },
        {
            replier_index: 1,
            original_user_index: 0,
            original_tweet_index: 5,
            reply: 'WebSocket performance is incredible! 🚀',
        },
        {
            replier_index: 2,
            original_user_index: 0,
            original_tweet_index: 11,
            reply: 'Redis caching test results are impressive! 📊',
        },
        {
            replier_index: 0,
            original_user_index: 2,
            original_tweet_index: 6,
            reply: 'All regression tests passed, great work! ✨',
        },
        {
            replier_index: 1,
            original_user_index: 2,
            original_tweet_index: 8,
            reply: 'Postman collections make API testing so easy! 🎯',
        },
        {
            replier_index: 2,
            original_user_index: 1,
            original_tweet_index: 9,
            reply: 'Accessibility audit passed with flying colors! ♿',
        },
    ];

    // Likes data structure for main 3 users liking each other's tweets
    static readonly TEST_LIKES = [
        { liker_index: 0, liked_user_index: 1, tweet_index: 0 },
        { liker_index: 0, liked_user_index: 1, tweet_index: 2 },
        { liker_index: 0, liked_user_index: 1, tweet_index: 4 },
        { liker_index: 0, liked_user_index: 2, tweet_index: 0 },
        { liker_index: 0, liked_user_index: 2, tweet_index: 3 },
        { liker_index: 1, liked_user_index: 0, tweet_index: 0 },
        { liker_index: 1, liked_user_index: 0, tweet_index: 1 },
        { liker_index: 1, liked_user_index: 0, tweet_index: 5 },
        { liker_index: 1, liked_user_index: 2, tweet_index: 6 },
        { liker_index: 1, liked_user_index: 2, tweet_index: 8 },
        { liker_index: 2, liked_user_index: 0, tweet_index: 2 },
        { liker_index: 2, liked_user_index: 0, tweet_index: 11 },
        { liker_index: 2, liked_user_index: 1, tweet_index: 3 },
        { liker_index: 2, liked_user_index: 1, tweet_index: 9 },
    ];
}
