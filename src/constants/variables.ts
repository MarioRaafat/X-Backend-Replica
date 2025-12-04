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
            password: 'Mario123#',
            name: 'Mario Raafat',
            username: 'mario_rafat12956014',
            birth_date: new Date('2004-05-22'),
            language: 'en' as const,
            avatar_url:
                'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764833843259-2.jpg',
        },
        {
            email: 'mohsen@yapper.test',
            password: 'Mohsen123#',
            name: 'Kero Mohsen',
            username: 'kero_mohsen239609562',
            birth_date: new Date('2005-03-03'),
            language: 'en' as const,
            avatar_url:
                'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764833909851-1.jpg',
        },
        {
            email: 'esraa@yapper.test',
            password: 'Esraa123#',
            name: 'Esraa Hassan',
            username: 'esraa_hassan7890560',
            birth_date: new Date('2004-09-10'),
            language: 'en' as const,
            avatar_url:
                'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764833566699-esraa.jpg',
        },
        {
            email: 'salah@yapper.test',
            password: 'Test123#',
            name: 'Mo Salah',
            username: 'mo_salah4567890',
            birth_date: new Date('1992-06-15'),
            language: 'en' as const,
            avatar_url:
                'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837060155-salah.jpg',
        },
        {
            email: 'messi@yapper.test',
            password: 'Test123#',
            name: 'Lionel Messi',
            username: 'lionel_messi8901234',
            birth_date: new Date('1987-06-24'),
            language: 'en' as const,
            avatar_url:
                'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837077268-messi.jpg',
        },
        {
            email: 'afsha@yapper.test',
            password: 'Test123#',
            name: 'Magdy Afsha',
            username: 'magdy_afsha2345678',
            birth_date: new Date('1996-03-06'),
            language: 'en' as const,
            avatar_url:
                'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837092750-afsha.jpg',
        },
        {
            email: '7amada@yapper.test',
            password: 'Test123#',
            name: '7amada ElSawy',
            username: '7amada_elsawy6789012',
            birth_date: new Date('2004-02-14'),
            language: 'en' as const,
            avatar_url:
                'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837119558-7amada.jpg',
        },
        {
            email: '3m_3abdo@yapper.test',
            password: 'Test123#',
            name: '3m 3abdo',
            username: '3m_3abdo3456789',
            birth_date: new Date('2003-08-19'),
            language: 'en' as const,
            avatar_url:
                'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837138612-3abdo.jpg',
        },
        {
            email: 'liverpool@yapper.test',
            password: 'Test123#',
            name: 'Liverpool FC',
            username: 'liverpool_fc9012345',
            birth_date: new Date('2002-12-30'),
            language: 'en' as const,
            avatar_url:
                'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837164100-liverpool.jpg',
        },
        {
            email: 'yapper@yapper.test',
            password: 'Test123#',
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
            user_index: 3, // Salah
            tweets: [
                {
                    content: 'Proud to represent Egypt 🇪🇬❤️ #Egypt #MoSalah',
                    images: [],
                },
                { content: 'What a night at Anfield! YNWA ❤️ #Liverpool #LFC', images: [] },
                { content: 'Training hard for the next match 💪⚽ #Football', images: [] },
                {
                    content: 'Thank you to all the Egyptian fans for your support! 🇪🇬 #Pharaohs',
                    images: [],
                },
                {
                    content: "Liverpool family forever! You'll Never Walk Alone 🔴 #YNWA",
                    images: [],
                },
            ],
        },
        {
            user_index: 4, // Messi
            tweets: [
                {
                    content:
                        'The greatest moment of my career! Lifting the World Cup trophy for Argentina 🏆🇦🇷 #WorldCup #Qatar2022 #Champion',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837204715-world%20cup.jpg',
                    ],
                },
                {
                    content:
                        'Another Golden Boot added to the collection! 👢✨ Hard work pays off #GoldenBoot #Topscorer',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837304076-golden%20boots.jpg',
                    ],
                },
                {
                    content:
                        "Proud to receive another Ballon d'Or! Thank you to everyone who believed in me 🏅⚽ #BallonDor #GoldenBall",
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837319026-golden%20ball.jpg',
                    ],
                },
                {
                    content:
                        'Champions League 2009 - What a night in Rome! First of many trophies with the best team 🏆⚽ #UCL #Champions #Barcelona',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837348076-champ.jpg',
                    ],
                },
                {
                    content:
                        'El Clásico 5-0! Historic night at Camp Nou 🔵🔴 Could they score even half of them? 😏⚽⚽⚽⚽⚽ #ElClasico #Barca #Historic',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837368024-5-0.jpg',
                    ],
                },
                {
                    content:
                        'Copa América champions! For my country, for my people 🇦🇷🏆 #CopaAmerica #VamosArgentina',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837383609-copa.jpg',
                    ],
                },
                {
                    content:
                        'Dreams do come true! World Cup winner! This is for all of Argentina 🌟🏆🇦🇷 #WorldCup2022 #GOAT #Argentina',
                    images: [
                        'https://yapperdev.blob.core.windows.net/profile-images/test-team-1764837398822-world%20cup2.jpg',
                    ],
                },
            ],
        },
        {
            user_index: 5, // Afsha
            tweets: [
                { content: 'يلا يا أهلي! ❤️🦅 #الاهلي', images: [] },
                { content: 'شرف ليا إني ألعب مع القلعة الحمرا 🏰❤️ #Ahly', images: [] },
                { content: 'القاضية ممكن 85:45', images: [] },
                {
                    content: `
                    تماس للمعلول، كورة لـ على، ٨٦ دقيقة، الاكسترا تايم قريب ولكن احذروا الـK.O احذروا الـK.O، ترجع الكورة بالراس، القاضية ممكن، القاضية ممكن.. شاط الكورة وجوووووووووووووول والقاضية ممممممكن، القاضية مممممممكن، القاضية ممممممكن.. سجلها ولد معلول، سجلها علي معلول.. ملك الحلول
Oui يا علي Oui , Oui يا علي Oui , Oui يا علي Oui , Oui يا علي Oui
علي Oui , معلول Oui .. والكورة Yes ، الكورة Sí. 
هل هو معلول أم لا؟
أي قذيفة جاءت؟ أي قذيفة جاءت يا باتشيكو؟
التاسعة يا الأهلي، التاسعة يا الأهلي، لا هو 19، هو قفشة، هو ولدنا قفشة..
هو الولد قفشة، هو قفشة، هو قفشة..
هو قفشة ما لها من عبسة، حط الكورة ثاني ويا لها من صرخة..
كي جولاثو يا قفشة، كي جولاثو يا قفشة..
                    `,
                    images: [],
                },
                {
                    content: 'مباراة القمة قدام و إن شاء الله هنكسب 🔴🦅 #ديربي',
                    images: [],
                },
            ],
        },
        {
            user_index: 6, // 7amada
            tweets: [
                { content: 'انا سبونج بوب', images: [] },
                { content: 'بوب بوب', images: [] },
                { content: 'انا سبونج بوب بوب بوب', images: [] },
                { content: 'انا سبونج بوب', images: [] },
                { content: 'اصفر لمونييييييييييييييي', images: [] },
            ],
        },
        {
            user_index: 7, // 3m 3abdo
            tweets: [
                { content: 'فول و طعمية الصبح أحسن حاجة 😋🥙 #فول', images: [] },
                { content: 'عربية الفول النهاردة كانت زحمة جداً 🚶‍♂️', images: [] },
                { content: 'الفول بالزبدة و الطماطم 👌 #فطار', images: [] },
                { content: 'مفيش أحسن من ريحة الفول الصبح ☀️🥙', images: [] },
                { content: 'فول و عيش سخن = سعادة 😊🍞', images: [] },
            ],
        },
        {
            user_index: 8, // Liverpool FC
            tweets: [
                {
                    content: "You'll Never Walk Alone 🔴 #LFC #YNWA",
                    images: [],
                },
                { content: 'This is Anfield. 🏟️❤️ #Liverpool', images: [] },
                { content: 'Match day at Anfield! Come on you Reds! 🔴⚽ #LFC', images: [] },
                { content: 'We are Liverpool, this means more. ❤️ #YNWA', images: [] },
                { content: "The Kop is ready! Let's go Reds! 🔴🎵 #Anfield", images: [] },
            ],
        },
        {
            user_index: 9,
            tweets: [
                { content: 'الباك تيم طرش الطرش', images: [] },
                {
                    content: 'تحية من الباك لاي راجل جدع هيكبس عالتويتة دي 👍',
                    images: [],
                },
                { content: 'تبا ل ايلون ماسك', images: [] },
                { content: 'و حبيبنا مييين Yapper 😍😍', images: [] },
                { content: 'يارب السيرفر يشتغل قدام م خالد', images: [] },
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
        {
            replier_index: 0,
            original_user_index: 1,
            original_tweet_index: 6,
            reply: 'The testing coverage for these animations is super important! 👍',
        },
        {
            replier_index: 1,
            original_user_index: 0,
            original_tweet_index: 8,
            reply: 'Clean code review comments are always appreciated! 😊',
        },
        {
            replier_index: 2,
            original_user_index: 1,
            original_tweet_index: 12,
            reply: 'Figma to code conversion was spot on! 🎨',
        },
        {
            replier_index: 0,
            original_user_index: 2,
            original_tweet_index: 12,
            reply: 'Mobile testing on different devices is crucial, thanks! 📱',
        },
        {
            replier_index: 1,
            original_user_index: 0,
            original_tweet_index: 12,
            reply: 'Pair programming sessions are always productive with you! 🤝',
        },
        {
            replier_index: 2,
            original_user_index: 0,
            original_tweet_index: 16,
            reply: 'CI/CD integration testing went smoothly! 🔄',
        },
        {
            replier_index: 0,
            original_user_index: 1,
            original_tweet_index: 11,
            reply: 'TypeScript really does make React better! 💯',
        },
        {
            replier_index: 1,
            original_user_index: 2,
            original_tweet_index: 15,
            reply: 'Edge cases are where the real bugs hide! 🔍',
        },
        {
            replier_index: 2,
            original_user_index: 1,
            original_tweet_index: 17,
            reply: 'PWA features tested across all platforms! ✅',
        },
        {
            replier_index: 0,
            original_user_index: 2,
            original_tweet_index: 17,
            reply: 'Quality metrics are looking fantastic this sprint! 📈',
        },
        {
            replier_index: 1,
            original_user_index: 0,
            original_tweet_index: 17,
            reply: 'Microservices communication is seamless now! 🎯',
        },
        {
            replier_index: 2,
            original_user_index: 1,
            original_tweet_index: 15,
            reply: 'Web performance audit shows great improvements! 🚀',
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
        { liker_index: 0, liked_user_index: 1, tweet_index: 6 },
        { liker_index: 0, liked_user_index: 1, tweet_index: 8 },
        { liker_index: 0, liked_user_index: 1, tweet_index: 11 },
        { liker_index: 0, liked_user_index: 1, tweet_index: 12 },
        { liker_index: 0, liked_user_index: 2, tweet_index: 6 },
        { liker_index: 0, liked_user_index: 2, tweet_index: 9 },
        { liker_index: 0, liked_user_index: 2, tweet_index: 12 },
        { liker_index: 0, liked_user_index: 2, tweet_index: 15 },
        { liker_index: 1, liked_user_index: 0, tweet_index: 8 },
        { liker_index: 1, liked_user_index: 0, tweet_index: 9 },
        { liker_index: 1, liked_user_index: 0, tweet_index: 12 },
        { liker_index: 1, liked_user_index: 0, tweet_index: 16 },
        { liker_index: 1, liked_user_index: 0, tweet_index: 17 },
        { liker_index: 1, liked_user_index: 2, tweet_index: 2 },
        { liker_index: 1, liked_user_index: 2, tweet_index: 12 },
        { liker_index: 1, liked_user_index: 2, tweet_index: 15 },
        { liker_index: 1, liked_user_index: 2, tweet_index: 17 },
        { liker_index: 2, liked_user_index: 0, tweet_index: 6 },
        { liker_index: 2, liked_user_index: 0, tweet_index: 8 },
        { liker_index: 2, liked_user_index: 0, tweet_index: 13 },
        { liker_index: 2, liked_user_index: 0, tweet_index: 16 },
        { liker_index: 2, liked_user_index: 0, tweet_index: 18 },
        { liker_index: 2, liked_user_index: 1, tweet_index: 6 },
        { liker_index: 2, liked_user_index: 1, tweet_index: 11 },
        { liker_index: 2, liked_user_index: 1, tweet_index: 15 },
        { liker_index: 2, liked_user_index: 1, tweet_index: 17 },
        { liker_index: 2, liked_user_index: 1, tweet_index: 18 },
    ];
}
