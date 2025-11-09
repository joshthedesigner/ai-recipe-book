'use client';

import { Box, Container, Typography, Paper, Alert } from '@mui/material';
import TopNav from '@/components/TopNav';
import { useRouter } from 'next/navigation';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export default function TermsOfServicePage() {
  const router = useRouter();

  const SummaryBox = ({ children }: { children: React.ReactNode }) => (
    <Alert 
      icon={<InfoOutlinedIcon fontSize="small" />} 
      severity="info" 
      sx={{ 
        my: 2, 
        bgcolor: '#e3f2fd',
        '& .MuiAlert-message': {
          fontSize: '0.8125rem',
          fontStyle: 'italic'
        }
      }}
    >
      <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.8125rem', fontStyle: 'normal' }}>
        Summary:
      </Typography>{' '}
      {children}
    </Alert>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#fafafa' }}>
      <TopNav />

      <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.75rem' }}>
            Terms of Service
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.8125rem' }}>
            Last Updated: November 9, 2025
          </Typography>

          <Box sx={{ '& p': { fontSize: '0.875rem', lineHeight: 1.6, mb: 1.5 }, '& li': { fontSize: '0.875rem', lineHeight: 1.6, mb: 0.5 } }}>
            <Typography paragraph>
              Welcome to RecipeBook! These Terms of Service ("Terms") apply to your ("you" or "your") use of RecipeBook's digital recipe management platform (the "Service"). By using the Service, you agree that these terms will become a legally binding agreement between you and RecipeBook ("RecipeBook", "we", "us" or "our").
            </Typography>

            <Alert severity="info" sx={{ my: 2, fontSize: '0.8125rem' }}>
              At RecipeBook, we believe in keeping things simple! You'll find simple explanations of our Terms in these boxes, but keep in mind only the Terms outside these boxes are legally binding.
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              1. Overview
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              a. Using RecipeBook
            </Typography>
            <Typography paragraph>
              RecipeBook is a digital recipe management platform that empowers people to organize, discover, and share recipes. When you use the Service, you'll have access to AI-powered features to help generate recipes, extract recipes from images and videos, and import recipes from URLs. You also have the option to upload your own content ("User Content"), such as recipe images, ingredient lists, cooking instructions, and other files, which you have full control and responsibility over. You can use our AI features, your User Content, and tools available in RecipeBook to create and manage your recipe collection (each a "Recipe").
            </Typography>
            <Typography paragraph>
              The Service is made available on RecipeBook websites, RecipeBook mobile apps (when available), and in other forms provided or made available by RecipeBook. Your use of the Service is subject to these Terms and RecipeBook's Acceptable Use Policy. RecipeBook's Privacy Policy explains how we treat your personal data and protect your privacy when you use the Service.
            </Typography>
            <Typography paragraph>
              You may use the Service only if you're legally able to form a binding contract with RecipeBook. By using the Service, you represent and warrant that you have the full right, power and authority to agree to and be bound by these Terms and to fully perform all of your obligations.
            </Typography>

            <SummaryBox>
              RecipeBook helps you manage and share your recipes. By using RecipeBook, you agree to these Terms. You must be legally able to enter into contracts to use our Service.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              b. Creating Teams
            </Typography>
            <Typography paragraph>
              Some of our plans allow you to create teams to share and collaborate on recipes with friends and family. If you create a team on behalf of an organization or others, you're binding them to these Terms and all the obligations set out in them. If they haven't authorized you to do this, you'll need someone who is authorized to create the team.
            </Typography>

            <SummaryBox>
              You can create teams to share recipes with others. Make sure you have permission to add people to teams.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              2. Using the Service
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              a. Age Requirement
            </Typography>
            <Typography paragraph>
              Children under the age of 13 (or the minimum legal age required to provide consent for processing of personal data in the country where the child is located) may not access or use the Service. By using the Service, you represent and warrant that you meet these age requirements.
            </Typography>

            <SummaryBox>
              You must be at least 13 years old (or the minimum legal age in your country) to use RecipeBook.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              b. Access to the Service
            </Typography>
            <Typography paragraph>
              Subject to your compliance with these Terms, you're granted a non-exclusive, limited, non-transferable, freely revocable license to access and use the Service for personal, family, or business use. RecipeBook reserves all rights not expressly granted under these Terms. Each person must have a unique account and you're responsible for any activity conducted on your account. You may not allow any other party to access or use the Service with your unique username, password, or other security code.
            </Typography>

            <SummaryBox>
              You can use RecipeBook for personal or business purposes. Keep your login credentials private and secure.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              c. Acceptable Use Policy
            </Typography>
            <Typography paragraph>
              Your use of the Service, your User Content, and your Recipes, must comply with RecipeBook's Acceptable Use Policy. You agree not to use the Service to create, store, or share any content that: (i) violates any laws or regulations; (ii) infringes on intellectual property rights; (iii) contains harmful, threatening, or abusive material; (iv) includes spam or unauthorized advertising; (v) contains malicious code or viruses; or (vi) violates the privacy or other rights of third parties. If you fail to comply with any provision of RecipeBook's Acceptable Use Policy, or any other terms or guidelines RecipeBook makes available to you for use of the Service, RecipeBook may delete or otherwise restrict the violating User Content and/or Recipes or suspend or terminate your account with immediate effect.
            </Typography>

            <SummaryBox>
              Use RecipeBook responsibly. Don't upload harmful, illegal, or inappropriate content. If you violate our policies, we may remove your content or suspend your account.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              d. Anti-discrimination
            </Typography>
            <Typography paragraph>
              RecipeBook doesn't support and won't tolerate its Service being used to discriminate against others, especially when based on race, religion, sex, sexual orientation, age, disability, ancestry or national origin. You're not permitted to use the Service in a manner which would or would likely incite, promote or support such discrimination and you must not use the Service to incite or promote hostility or violence.
            </Typography>

            <SummaryBox>
              We believe in creating an inclusive community and don't tolerate RecipeBook being used in discriminatory ways.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              e. Restrictions on Use of the Service
            </Typography>
            <Typography paragraph>
              You will not yourself or through any third party: (i) rent, lease, sell, distribute, offer in a service bureau, sublicense, or otherwise make available the Service to any third party (except as permitted under these Terms); (ii) copy, replicate, decompile, reverse-engineer, attempt to derive the source code of, modify, or create derivative works of the Service, or any part thereof; (iii) access the Service for purposes of performance benchmarking; (iv) access the Service for purposes of building or marketing a competitive product; (v) use the Service to create, store or transmit a virus or malicious code; (vi) use a virtual private network (VPN) to circumvent geographic-based pricing or content access; (vii) use the Service to transmit unsolicited emails or engage in spamming or phishing; (viii) use any form of data mining, extraction, or scraping on the Service and/or the contents available in it for any purpose (including but not limited to AI, machine learning, and data science purposes by third parties); or (ix) bypass the measures we may use to prevent or restrict access to the Service.
            </Typography>

            <SummaryBox>
              We work hard to make RecipeBook available to everyone, so we can't allow you to bring harm to RecipeBook or the platform or use it in unauthorized ways.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              3. Security and Data Privacy
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              a. Information Security
            </Typography>
            <Typography paragraph>
              RecipeBook implements and maintains physical, technical and administrative security measures designed to protect your information from unauthorized access, destruction, use, modification or disclosure. You can learn more about how RecipeBook protects the Service and your information in our Privacy Policy and security documentation.
            </Typography>

            <SummaryBox>
              We take security seriously and implement industry-standard measures to protect your data.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              b. Data Privacy
            </Typography>
            <Typography paragraph>
              RecipeBook's Privacy Policy applies to the personal data that RecipeBook collects, uses, transfers, discloses and stores about your accounts, use of the Service, User Content and Recipes. By using the Service, you consent to the collection, use, and sharing of your information as described in our Privacy Policy.
            </Typography>

            <SummaryBox>
              Our Privacy Policy explains how we handle your personal information. By using RecipeBook, you agree to our privacy practices.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              4. Content and Recipes
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              a. User Content
            </Typography>
            <Typography paragraph>
              You represent and warrant that you own all rights, title, and interest in and to your User Content or that you have otherwise secured all necessary rights in your User Content as may be necessary to permit the access, use and distribution thereof as contemplated by these Terms. As between you and RecipeBook, you own all right, title and interest in and to your User Content. You grant RecipeBook a royalty-free and sublicensable license to display, host, copy, store and use your User Content to provide the Service to you, including to keep the Service safe and secure, and to enforce our Acceptable Use Policy and these terms. These protections apply at all times to protect our community and are an essential part of providing the Service. To the extent you include User Content in a Recipe that you've shared with others, you grant RecipeBook a perpetual, royalty-free, sublicensable, license to display, host, copy, store and use your User Content to the extent necessary to continue to make that Recipe available.
            </Typography>

            <SummaryBox>
              When you upload content to RecipeBook, you're guaranteeing that you have the rights to it. We never obtain any ownership over your content, but we do need you to give us certain rights to store it and have it ready for you to use in your recipes.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              b. AI-Generated Content
            </Typography>
            <Typography paragraph>
              RecipeBook uses artificial intelligence to help generate recipes and extract recipe information from various sources including images, videos, and URLs. AI-generated content is provided "as is" and: (i) may not always be accurate or suitable for your needs; (ii) should be reviewed before use, especially for dietary restrictions, allergies, or food safety; (iii) is your responsibility to verify and test before preparation or consumption. RecipeBook is not responsible for any issues arising from the use of AI-generated recipes, including but not limited to health issues, allergic reactions, or food safety concerns.
            </Typography>
            <Typography paragraph>
              Your Privacy Settings allow you to control whether your recipes and usage data can be used to improve AI-powered features. RecipeBook and its trusted partners may use this data to develop and improve AI-powered features if this is consistent with your Privacy Settings, which you can review and update at any time in your account settings.
            </Typography>

            <SummaryBox>
              Our AI features help you create and organize recipes, but you should always verify AI-generated content before use. You control whether your data is used to improve our AI features.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              c. Recipes
            </Typography>
            <Typography paragraph>
              Your Recipes may include a combination of your User Content, AI-generated content, and content imported from third-party sources. While you retain ownership of your User Content, you acknowledge that recipes themselves (being collections of ingredients and instructions) may not be subject to copyright protection in many jurisdictions. RecipeBook does not claim any ownership over your Recipes, but you grant us the licenses described in these Terms to enable the functionality of the Service.
            </Typography>

            <SummaryBox>
              We never own your recipes, but we need certain rights to store and display them as part of the Service.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              d. Sharing Your Recipes
            </Typography>
            <Typography paragraph>
              You may share Recipes with friends within the Service. By default, your recipes are private and only visible to you unless you explicitly share them. When you share a recipe with a friend, that friend can view the recipe and any associated content. You are responsible for managing your sharing settings and for any content you choose to share. RecipeBook maintains no responsibility in relation to such sharing of Recipes and RecipeBook's enablement of such activity will not be considered a violation of any of RecipeBook's obligations under these Terms.
            </Typography>

            <SummaryBox>
              Your recipes are private by default. You control what you share and with whom. We're not responsible for content you choose to share.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              5. Use of AI Features
            </Typography>
            <Typography paragraph>
              You may use AI-powered features and functionality RecipeBook may make available on the Service from time to time, including but not limited to: (i) AI recipe generation based on ingredients, preferences, or dietary restrictions; (ii) recipe extraction from images, videos, and URLs; (iii) recipe translation and localization; and (iv) recipe recommendations and discovery. Your use of AI features is subject to the following additional terms:
            </Typography>
            <Typography paragraph>
              RecipeBook uses third-party AI services (including OpenAI) to power certain features. By using AI features, you acknowledge and agree that your inputs and the AI-generated outputs may be processed by these third-party services subject to their respective terms and privacy policies. RecipeBook does not guarantee the accuracy, completeness, or suitability of any AI-generated content. You are solely responsible for reviewing, verifying, and testing any AI-generated recipes before use. RecipeBook explicitly disclaims any liability for issues arising from the use of AI-generated recipes, including but not limited to health issues, allergic reactions, food poisoning, or unsatisfactory results.
            </Typography>

            <SummaryBox>
              Our AI features use third-party services to help you create recipes. Always verify AI-generated content before use. We're not responsible for issues that may arise from using AI-generated recipes.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              6. Friend Management
            </Typography>
            <Typography paragraph>
              You can add friends on RecipeBook that allows you to share recipes with them. When you add friends: (i) friends can view recipes you explicitly share with them; (ii) you can view recipes your friends share with you; (iii) you can remove friends at any time; and (iv) RecipeBook may share your name, email, and basic profile information with friends you connect with to facilitate the friend relationship. You represent and warrant that you have the necessary permissions and rights to add any person as a friend and share content with them.
            </Typography>

            <SummaryBox>
              You can connect with friends to share recipes. Make sure you have permission to share content and add people as friends.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              7. Billing
            </Typography>
            <Typography paragraph>
              RecipeBook offers free and paid Services. Pricing may vary by location and will be based on the billing information you provide us at the time of purchase.
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              a. Subscriptions and Renewals
            </Typography>
            <Typography paragraph>
              If you're subscribing to a paid plan your subscription will automatically renew each billing cycle, for example, on a monthly or annual basis as applicable. We'll notify you before auto-renewal of your subscription. You can cancel your subscription at any time, subject to the cancellation terms below.
            </Typography>

            <SummaryBox>
              Paid subscriptions automatically renew. You'll be notified before renewal and can cancel anytime.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              b. Taxes
            </Typography>
            <Typography paragraph>
              Your subscription fees are inclusive of all taxes unless otherwise specified in an agreement with RecipeBook or on an applicable invoice. Tax rates are calculated based on the billing information you provide and the applicable tax rate at the time of your subscription charge. You represent and warrant that information you provide to RecipeBook about your billing address will be current and accurate.
            </Typography>

            <SummaryBox>
              Prices include taxes unless stated otherwise. Keep your billing information current and accurate.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              c. Cancellation
            </Typography>
            <Typography paragraph>
              You can stop using the Service and/or cancel your subscription at any time via your account settings. If you cancel your subscription, your subscription will be cancelled at the end of your then-current billing cycle and you will not be entitled to a refund of any fees already paid (except where required by law) and any outstanding fees will become immediately due and payable.
            </Typography>

            <SummaryBox>
              You can cancel anytime. Your access continues until the end of your paid period, and we don't provide refunds except where required by law.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              d. Free Trials
            </Typography>
            <Typography paragraph>
              RecipeBook may offer you a free trial to allow you to try our Service. RecipeBook reserves the right to set eligibility requirements and the duration for free trials. At the end of your free trial, RecipeBook will charge the relevant subscription fee for the next billing cycle to your nominated payment method, unless you cancel your subscription prior to the end of the free trial.
            </Typography>

            <SummaryBox>
              We may offer free trials. You'll be charged when the trial ends unless you cancel first.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              e. Changes to Pricing
            </Typography>
            <Typography paragraph>
              RecipeBook reserves the right to change its prices and plans at any time. If you're on a subscription plan and we increase your price, any increase in price will not apply until your next renewal or thirty (30) days after notice, whichever is later. If you do not wish to pay the increased price, you may cancel your subscription.
            </Typography>

            <SummaryBox>
              We may change our prices. If we increase prices for subscribers, you'll have notice before it takes effect and can cancel if you don't want to pay the new price.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              f. Billing Communications
            </Typography>
            <Typography paragraph>
              You agree that RecipeBook may contact you at any time by email, push notifications, or other method with information relevant to your subscription, billing, and use of the Service.
            </Typography>

            <SummaryBox>
              We'll contact you about billing and subscription matters. This is part of using the Service.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              8. RecipeBook's Intellectual Property
            </Typography>
            <Typography paragraph>
              Except as expressly set out in these Terms, all intellectual property rights in and to the Service remain the sole property of RecipeBook and its licensors. This includes but is not limited to: the RecipeBook platform, website, applications, algorithms, AI models, design elements, branding, logos, and any other technology or content provided by RecipeBook. You assign to RecipeBook any suggestions, ideas, enhancement requests, or other feedback you provide to RecipeBook relating to the Service or RecipeBook's products. RecipeBook owns all content, data, software, inventions, ideas and other technology and intellectual property that it develops in connection with the Service and its products.
            </Typography>

            <SummaryBox>
              We get great ideas about how to improve RecipeBook from our users. If you share feedback or ideas with us, you're letting us use that information to improve RecipeBook, and we own any of those improvements we make.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              9. Warranty Disclaimer
            </Typography>
            <Typography paragraph>
              The Service is provided on an "as-is" and "as-available" basis. To the maximum extent permitted by applicable law and subject to any non-excludable rights and remedies you may have under applicable law, RecipeBook, its licensors, and its suppliers, expressly disclaim any and all warranties of any kind, whether express or implied, including, but not limited to, warranties of merchantability, fitness for a particular purpose, or non-infringement. RecipeBook does not warrant that your use of the Service will be uninterrupted or error-free. RecipeBook does not warrant that it will review your data for accuracy or that it will preserve or maintain your data without loss. You understand that use of the Service necessarily involves transmission of your data over networks that RecipeBook does not own, operate, or control, and that RecipeBook is not responsible for any of your data lost, altered, intercepted or stored across such networks. RecipeBook will not be liable for delays, interruptions, service failures, or other problems inherent in use of the internet and electronic communications or other systems outside RecipeBook's reasonable control.
            </Typography>
            <Typography paragraph>
              RecipeBook specifically disclaims any warranty or representation that: (i) recipes generated or suggested by the Service will be safe, accurate, or suitable for your dietary needs or restrictions; (ii) recipes will produce the expected results when prepared; (iii) AI-generated content will be free from errors or inaccuracies; (iv) the Service will meet your specific requirements; or (v) any errors in the Service will be corrected.
            </Typography>

            <SummaryBox>
              We offer the Service as-is and can't be responsible for things outside of our control. Always verify recipes for safety and suitability before use.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              10. Health and Safety
            </Typography>
            <Typography paragraph>
              RecipeBook provides recipes for informational and educational purposes only. We are not responsible for: (i) food safety or preparation quality; (ii) allergic reactions or dietary issues; (iii) nutritional accuracy of recipes; (iv) any health issues resulting from recipe use; (v) food poisoning or other foodborne illnesses; (vi) the suitability of any recipe for your specific dietary needs, restrictions, or health conditions; or (vii) any injuries or damages that may result from preparing or consuming recipes obtained through the Service.
            </Typography>
            <Typography paragraph>
              You acknowledge and agree that: (i) you are solely responsible for verifying the safety and suitability of any recipe before preparing or consuming it; (ii) you should consult with qualified healthcare professionals regarding any dietary restrictions, allergies, or health conditions before using recipes from the Service; (iii) food preparation carries inherent risks including but not limited to burns, cuts, and other kitchen-related injuries; (iv) improper food storage, preparation, or handling can result in foodborne illness; and (v) RecipeBook makes no representations or warranties about the nutritional content, calorie counts, or health benefits of any recipes.
            </Typography>

            <SummaryBox>
              RecipeBook provides recipes for informational purposes only. We're not responsible for food safety, allergic reactions, health issues, or injuries. Always verify recipes are safe for your specific needs and consult healthcare professionals about dietary restrictions.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              11. Third Party Services
            </Typography>
            <Typography paragraph>
              You may elect to use the Service in conjunction with third-party services, websites, platforms or apps ("Third Party Service(s)"). This includes but is not limited to: authentication services (such as Google Sign-In), social media platforms for sharing, recipe websites for importing recipes, and AI service providers. Your use of a Third Party Service is subject to the terms and conditions applicable to that Third Party Service. RecipeBook makes no representations or warranties in relation to Third Party Services and, to the extent permitted by law, expressly disclaims all liability arising from your use of Third Party Services.
            </Typography>

            <SummaryBox>
              You can use third-party services with RecipeBook. Those services have their own terms, and we can't be responsible for them.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              12. Your Indemnity Obligations
            </Typography>
            <Typography paragraph>
              You agree, to the extent permitted by law, to defend, indemnify and hold harmless RecipeBook and its affiliates, officers, directors, agents, licensors and employees from and against any and all claims, costs, damages, losses, liabilities and expenses (including reasonable attorneys' fees and costs) resulting from or related to: (i) your violation of these Terms; (ii) your User Content; (iii) your use or misuse of the Service; (iv) your violation of any law or regulation; (v) your violation of any rights of any third party; (vi) any harm or damages arising from your preparation or consumption of recipes obtained through the Service; or (vii) your sharing of recipes or other content with third parties.
            </Typography>

            <SummaryBox>
              If RecipeBook suffers harm due to your content, your violation of these Terms, or your use of the Service, or if someone tries to hold RecipeBook responsible for your actions, you'll be responsible for any costs incurred by RecipeBook.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              13. Limitation of Liability
            </Typography>
            <Typography paragraph>
              In no event will either party's aggregate cumulative liability (whether in contract, tort, negligence, strict liability in tort or by statute or otherwise) exceed the greater of (i) $100 USD or (ii) the subscription fees paid by you to RecipeBook during the twelve-month period preceding the event or occurrence giving rise to such liability. These limitations will not apply to liabilities arising out of your indemnification obligations or your breach of the section entitled 'Restrictions on Use of the Service.'
            </Typography>
            <Typography paragraph>
              In no event will either party be liable for any consequential, incidental, indirect, special, exemplary or punitive damages, losses, or expenses (including but not limited to business interruption, lost business or lost profits, health issues, food poisoning, allergic reactions, or any other damages arising from the preparation or consumption of recipes) even if it has been advised of their possible existence and notwithstanding the failure of essential purpose of any remedy. These limitations will not apply to liabilities arising out of your indemnification obligations or your breach of the section entitled 'Restrictions on Use of the Service.'
            </Typography>
            <Typography paragraph>
              RecipeBook is not responsible for, and assumes no liability for, the contents of User Content, AI-generated content, or any recipes imported from third-party sources. These terms do not affect consumer rights that cannot by law be waived or limited. These terms do not exclude or limit liability arising out of either party's gross negligence, fraud or willful misconduct.
            </Typography>

            <SummaryBox>
              Our liability is limited. We're not responsible for indirect damages including health issues from using recipes. Consumer rights that can't be waived by law still apply.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              14. Term and Termination
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              a. Term
            </Typography>
            <Typography paragraph>
              These Terms will take effect the first time you access the Service and will continue in full force and effect until your account is deleted or terminated.
            </Typography>

            <SummaryBox>
              These Terms apply from when you first use RecipeBook until your account is closed.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              b. Violations
            </Typography>
            <Typography paragraph>
              If RecipeBook, in its reasonable discretion, determines that you or your use of the Service, your User Content, or your Recipes violate these Terms, including but not limited to, RecipeBook's Acceptable Use Policy, or the sections entitled 'Restrictions on Use of the Service' or 'Anti-discrimination' (any of which is considered a "Violation"), RecipeBook may take one or more of the following actions: (i) delete or otherwise restrict the prohibited User Content or Recipes; (ii) suspend your access to the Service; (iii) terminate and delete your account along with all Recipes and User Content associated with that account; (iv) permanently ban you from using the Service; and/or (v) disclose the prohibited User Content or Recipes and related information to appropriate third parties, such as government authorities or law enforcement.
            </Typography>

            <SummaryBox>
              If you break the rules, we have the right to remove you and everything in your account from the Service.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              c. Effect of Termination
            </Typography>
            <Typography paragraph>
              In the event of termination of your subscription for cause due to default by RecipeBook, RecipeBook will refund, on a prorated basis, any prepaid fees for the Service for the period beginning on the effective date of termination through the end of your then-current subscription. In the event of a termination of your subscription due to a Violation by you, you will not receive any refund and will immediately pay any outstanding fees for the remaining period of your subscription.
            </Typography>
            <Typography paragraph>
              Upon termination, you must cease using the Service. You will lose access to your Recipes, User Content, and any other information uploaded to the Service (and we may delete all such data unless legally prohibited) after termination. Unless your account was terminated due to a Violation, you can download or export your recipes using the functionality of the Service prior to the expiration or termination of your subscription. If your account has been terminated due to a Violation, you may not create a new account on RecipeBook unless you receive RecipeBook's written permission.
            </Typography>

            <SummaryBox>
              When your account is terminated, you lose access to your content. Download your recipes before canceling unless your account was terminated for violations.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              15. Dispute Resolution and Governing Law
            </Typography>
            <Typography paragraph>
              These Terms will be governed by and construed in accordance with the laws of the State of California, USA, without regard to any conflict of laws provisions. If you have a dispute arising out of these Terms, contact us at support@recipebook.app first and we'll attempt to work with you to resolve the dispute. In the event that we're unable to resolve a dispute directly, you and RecipeBook each agree to resolve any claim, dispute, or controversy (excluding any RecipeBook claims for injunctive or other equitable relief) arising out of or in connection with these Terms and/or the Service by binding arbitration as described in our dispute resolution procedures, or by small claims court if the dispute qualifies.
            </Typography>

            <SummaryBox>
              These Terms are governed by California law. Contact us first if you have a dispute. Disputes may be resolved through arbitration.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              16. Miscellaneous
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              a. Assignment
            </Typography>
            <Typography paragraph>
              You may not assign these Terms or any of your rights under these Terms without RecipeBook's written consent except to any successor by way of a merger, acquisition, or change of control. RecipeBook may transfer or assign any of its rights and obligations under these Terms, in whole or in part, at any time with or without notice.
            </Typography>

            <SummaryBox>
              You can't transfer your rights under these Terms without permission. We can transfer ours when needed.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              b. Marketing Communications
            </Typography>
            <Typography paragraph>
              By creating a RecipeBook account, you consent to receiving offers, updates and other marketing communications from RecipeBook. We may send these messages to the email address or other contact details you use to create your account. Please keep this information current so you don't miss important notices. You can withdraw or adjust your marketing preferences at any time via your account settings or the unsubscribe link in any marketing message we send you, without any cost to you. You will continue to receive essential service-related and legally required communications even if you opt out of marketing messages.
            </Typography>

            <SummaryBox>
              You'll receive marketing emails when you sign up. You can opt out anytime, but you'll still get important service updates.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              c. Severability
            </Typography>
            <Typography paragraph>
              If a particular provision of these Terms is found to be invalid or unenforceable, it will not affect the validity or enforceability other provisions and the Terms shall be construed in all respects as if that invalid or unenforceable provision had been limited or omitted to the minimum extent necessary.
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              d. Changes to these Terms
            </Typography>
            <Typography paragraph>
              We may modify these Terms (and any policies or agreements referenced in these Terms) at any time. We will post the most current version of these Terms on our website. We will provide you with reasonable advance notice of any change to the Terms that, in our reasonable determination, materially adversely affect your rights or your use of the Service. We may provide you this notice via the Service and/or by email to the email address associated with your account. By continuing to use the Service after any revised Terms become effective, you agree to be bound by the new Terms.
            </Typography>

            <SummaryBox>
              We may update these Terms. We'll notify you of significant changes, and continued use means you accept the new Terms.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              e. Changes to the Service
            </Typography>
            <Typography paragraph>
              RecipeBook may add, change or remove features or functionality to the Service; modify or introduce limitations to storage or other features; or discontinue the Service altogether at any time. If you're on a paid subscription and RecipeBook discontinues the Service you're using during your subscription, RecipeBook will provide you a pro-rata refund of fees prepaid for the remaining period of your subscription.
            </Typography>

            <SummaryBox>
              We may change or discontinue features. If we discontinue a paid service, you'll get a refund for the unused period.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              f. Entire Agreement
            </Typography>
            <Typography paragraph>
              These Terms and the terms and policies referenced in these terms constitute the entire agreement between you and RecipeBook with respect to the Service. These Terms supersede any prior representations, agreements, or understandings between you and RecipeBook, whether written or oral, with respect to the Service including previous versions of the Terms. The English version of these Terms will control.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              17. How to contact us
            </Typography>
            <Typography paragraph>
              If you have any questions about these Terms of Service or the Service, please contact us at:
            </Typography>
            <Typography paragraph>
              Email: support@recipebook.app
            </Typography>

            <SummaryBox>
              We're here to help. Contact us if you have questions about these Terms.
            </SummaryBox>

            <Box sx={{ mt: 5, p: 2.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', fontStyle: 'italic' }}>
                By using RecipeBook, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Footer */}
      <Box 
        component="footer" 
        sx={{ 
          py: 3, 
          px: 2, 
          mt: 'auto',
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Typography
              variant="body2"
              sx={{ 
                color: 'primary.main',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                '&:hover': { textDecoration: 'underline' }
              }}
              onClick={() => router.push('/privacy')}
            >
              Privacy Policy
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              © {new Date().getFullYear()} RecipeBook
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
