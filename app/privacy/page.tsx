'use client';

import { Box, Container, Typography, Paper, Alert } from '@mui/material';
import TopNav from '@/components/TopNav';
import { useRouter } from 'next/navigation';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.8125rem' }}>
            Last Updated: November 9, 2025
          </Typography>

          <Box sx={{ '& p': { fontSize: '0.875rem', lineHeight: 1.6, mb: 1.5 }, '& li': { fontSize: '0.875rem', lineHeight: 1.6, mb: 0.5 } }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3, mb: 1.5, fontSize: '1rem' }}>
              What does this policy cover
            </Typography>
            <Typography paragraph>
              Welcome to RecipeAssist. This Privacy Policy explains how RecipeAssist ("RecipeAssist", "we", "us" or "our") and its affiliates collect, use, disclose, and protect information when you use RecipeAssist's services (the "Service") or interact with us, and your choices about the collection and use of your information. Capitalized terms that are not defined in this Privacy Policy have the meaning given to them in our Terms of Use. If you do not want your information processed in accordance with this Privacy Policy in general or any part of it, you should not use our Service. This policy applies to all users of the Service, including contributors, recipe creators, and users of our AI-powered features.
            </Typography>

            <SummaryBox>
              Welcome, here is our policy on privacy. This policy sets out how RecipeAssist collects and uses the information that we collect about you when you use the Service. This policy also explains the choices that you can make about the way that we use your information.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              1. Information we collect
            </Typography>
            <Typography paragraph>
              We collect the following types of information about you:
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (a) Information you provide us directly
            </Typography>
            <Typography paragraph>
              We may ask for certain information when you register for a RecipeAssist account or interact with us (such as a username, your first and last names, birthdate, phone number, profession, physical and e-mail address). We also collect any messages you send us through the Service (such as user feedback, search queries and prompts for AI recipe generation), and may collect information you provide in User Content you post to the Service (such as recipe text, ingredient lists, cooking instructions, and photos you upload to use in your recipes). We use this information to operate, maintain, improve and provide the features and functionality of the Service to you, to correspond with you, and to address any issues you raise about the Service. If you don't provide your personal information to us, you may not be able to access or use our Service or your experience of using our Service may not be as enjoyable.
            </Typography>

            <SummaryBox>
              We collect info about you that you choose to give us, for example when you register an account, use the Service or otherwise interact with us.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (b) Information we receive from third-party applications or services
            </Typography>
            <Typography paragraph>
              We may receive information about you from third parties. For example, if you access the Service through a third-party connection or log-in, such as Google Sign-In or Facebook Connect, by "following," "liking," adding the RecipeAssist application, linking your account to the RecipeAssist Service, etc., that third party may pass certain information about your use of its service to RecipeAssist. This information could include, but is not limited to, the user ID associated with your account, an access token necessary to access that service, any information that you have permitted the third party to share with us, and any information you have made public in connection with that service. You should always review, and if necessary, adjust your privacy settings on third-party websites and services before linking or connecting them to the Service. You may also unlink your third party account from the Service by adjusting your settings on the third party service. If you unlink your third party account, we will no longer receive information collected about you in connection with that service.
            </Typography>

            <SummaryBox>
              When you use our Service, for example, if you log in through a third-party application like Google or Facebook, we may obtain information about you from such third-party application.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (c) Information we receive from other third parties
            </Typography>
            <Typography paragraph>
              We may obtain information about you from third-party sources, such as public sources, social media platforms (like Facebook, Instagram, LinkedIn, Twitter and other platforms) and third-party data providers and information services. Examples of the information we may obtain from such third parties include your company, company size, job title and seniority, industry and other profile information. We may share your email address or other information in order to obtain and combine this information with information that you provide to us or other information that we collect when you use our Service. We do this to better understand your profile and interests so that we can deliver customized offers and other personalized services to you, such as to serve relevant offers to you via email, phone or personalized advertising. Some of these providers may combine data collected from our Service through cookies, pixels, tags and similar technologies, with email or mailing addresses to which they have access to help us serve relevant offers to you. We may also receive information about you and your engagement with our advertisements from our ad servers, ad networks and social media platforms. This may include the websites you visited before coming to RecipeAssist so that we can determine advertising effectiveness and pay our referral partners. If you prefer not to have your information used for this purpose, you can opt out at any time by emailing us at privacy@recipebook.app.
            </Typography>

            <SummaryBox>
              We may obtain information about you from third-party sources so that we can understand your interests and personalize our communications and promotions to you. You can opt out at any time.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (d) Information we collect from you automatically
            </Typography>
            <Typography paragraph>
              We will directly collect or generate certain information about your use of the Service (such as user activity data, analytics event data, and clickstream data) for data analytics and machine learning, and to help us measure traffic and usage trends for the Service. We may also use third party analytics tools (including PostHog) that automatically collect information sent by your browser or mobile device, including the pages you visit and other information, that assists us in improving the Service. For more information, please see the paragraphs below on cookies information, log file information, clear gifs, device identifiers, and location data.
            </Typography>

            <SummaryBox>
              We collect and generate certain info about how you use our Service automatically. This helps us to provide and improve the Service for you.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (e) Cookies information and information taken from similar technologies
            </Typography>
            <Typography paragraph>
              When you visit the Service, we (and our third-party partners) will create online identifiers and collect information using cookies and similar technologies ("Cookies") — small text files that uniquely identify your browser and lets RecipeAssist do things like help you log in faster, enhance your navigation through the site, remember your preferences and generally improve the user experience. Cookies also convey information to us about how you use the Service (e.g., the pages you view, the links you click and other actions you take on the Service), and allow us to track your usage of the Service over time. They also allow us to measure traffic and usage trends for the Service and improve our internal operations. We use cookies primarily for essential functionality (such as authentication and session management) and internal analytics (via PostHog for performance tracking). We do not use third-party advertising cookies or share your data with advertising networks for behavioral advertising purposes. You can control or reset your cookies and similar technologies through your web browser, which will allow you to customize your cookie preferences and to refuse all cookies or to indicate when a cookie is being sent. However, some features of the Service may not function properly if the ability to accept cookies is disabled.
            </Typography>

            <SummaryBox>
              We use cookies to help you use RecipeAssist and for internal analytics. We do not use third-party advertising cookies. You can control them through your browser settings, but some features may not work without them.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (f) Log file information
            </Typography>
            <Typography paragraph>
              Log file information is automatically reported by your browser or mobile device each time you access the Service. When you use our Service, our servers automatically record certain log file information. These server logs may include anonymous information such as your web request, browser type, referring / exit pages and URLs, number of clicks and how you interact with links on the Service, domain names, landing pages, pages viewed, and other such information.
            </Typography>

            <SummaryBox>
              Whenever you load a page from RecipeAssist, your browser sends us info about itself and your interactions with our Service. That info gets stored on our servers.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (g) Clear gifs/web beacons information
            </Typography>
            <Typography paragraph>
              When you use the Service, we may employ clear GIFs (also known as web beacons) which are used to anonymously track the online usage patterns of our users. In addition, we may also use clear GIFs in HTML-based emails sent to our users to track which emails are opened and which links are clicked by recipients. This information allows for more accurate reporting and improvement of the Service.
            </Typography>

            <SummaryBox>
              We might use small images in order to check how many people open our emails and visit our site.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (h) Device identifiers
            </Typography>
            <Typography paragraph>
              When you access the Service on a device (including smart-phones or tablets), we may access, collect and/or monitor one or more "device identifiers," such as a universally unique identifier ("UUID"). Device identifiers are small data files that uniquely identify your mobile device. A device identifier may convey information to us about how you use the Service. A device identifier may remain persistently on your device, to help you log in and navigate the Service better. Some features of the Service may not function properly if use of device identifiers is impaired. Device Identifiers used by RecipeAssist include the Android Advertising ID and iOS Advertising Identifier.
            </Typography>

            <SummaryBox>
              Your phone or device sends us information about your usage.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (i) Location data
            </Typography>
            <Typography paragraph>
              RecipeAssist collects information in order to understand where its users are located for a number of reasons. It helps RecipeAssist to localize and personalize content, comply with local laws, undertake aggregated analytics, understand if its users use RecipeAssist for domestic, business or educational use, improve advertising efficiency and estimate the tax liability of RecipeAssist. RecipeAssist may collect your precise or approximate location: from you, when you provide, correct or confirm your location; by inferring your location from your IP address; and from our partners or your payment provider.
            </Typography>

            <SummaryBox>
              RecipeAssist may collect and use your location data for personalization, analytics, advertising and tax purposes.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (j) Content within your account
            </Typography>
            <Typography paragraph>
              We receive content that you create within RecipeAssist and media you upload, such as recipes, images, documents, videos, ingredient lists, cooking instructions, and metadata about your content including tags, cuisine types, and dietary preferences.
            </Typography>

            <SummaryBox>
              RecipeAssist collects the content you upload to your account including all recipes, photos, and related data.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              2. How we use your information
            </Typography>
            <Typography paragraph>
              We use the information we collect about you for the purposes set out in this policy:
            </Typography>

            <Typography paragraph sx={{ fontWeight: 500, mt: 2 }}>
              Providing you with the Service:
            </Typography>
            <Typography paragraph>
              We use information about you to provide the Service to you. This includes allowing you to log in to RecipeAssist, operating and maintaining the Service, giving you access to your recipes and billing you for transactions that you make via the Service. We also use information we collect about you automatically to remember information about you so that you will not have to re-enter it during your visit or the next time you visit the site.
            </Typography>

            <Typography paragraph sx={{ fontWeight: 500, mt: 2 }}>
              For data analytics:
            </Typography>
            <Typography paragraph>
              We use information about you to help us improve the RecipeAssist Service and our users' experience, including by monitoring aggregate metrics such as total number of visitors, traffic, demographic patterns, popular recipes, and usage trends across different recipe categories.
            </Typography>

            <Typography paragraph sx={{ fontWeight: 500, mt: 2 }}>
              For Service improvement (including analytics and machine learning):
            </Typography>
            <Typography paragraph>
              We may analyze your activity, content, media uploads and related data in your account to provide and customize the Service, and to train our algorithms, models and AI products and services using machine learning to develop, improve and provide our Service. We do not use personally identifiable data or private user content for public AI model training unless it has been aggregated, anonymized, or users have explicitly consented through their privacy settings. When we use third-party AI service providers (such as OpenAI), we utilize their API services which do not train models on your data by default. These activities include, but are not limited to: detecting and categorizing food items in images to provide better recipe suggestions; labeling aggregated raw data (e.g., "chocolate cake recipe"); understanding recipe preferences and dietary restrictions; predicting the most relevant recipe recommendations for a user; and search terms and corresponding search interaction data to deliver the most relevant recipe results.
            </Typography>

            <Typography paragraph sx={{ fontWeight: 500, mt: 2 }}>
              Customizing the Service for you:
            </Typography>
            <Typography paragraph>
              We use and combine the information you provide us and information about you that we collect automatically and receive from other sources (including information we receive on and off our Service) and combine it with information about the behavior of other users to make sure that your use of the Service is customized to your needs. For example, to recommend recipes, ingredients and cooking methods that are likely to be useful to you, we may use information derived from your prior behavior on our Service, the preferences of other people with similar tastes, and other inferred information.
            </Typography>

            <Typography paragraph sx={{ fontWeight: 500, mt: 2 }}>
              To communicate with you about the Service:
            </Typography>
            <Typography paragraph>
              We use your contact information to get in touch with you and to send communications about critical elements of the Service. For example, we may send you emails about technical issues, security alerts, account updates, or administrative matters.
            </Typography>

            <Typography paragraph sx={{ fontWeight: 500, mt: 2 }}>
              To promote and drive engagement with the RecipeAssist Service:
            </Typography>
            <Typography paragraph>
              We use your contact information to get in touch with you about taking part in our surveys or about features and offers relating to the Service that we think you would be interested in. We also use information we collect about you to make sure that you get the most relevant offers and promotions based on your use of the Service, and your preferences. You can opt-out of these communications as described below.
            </Typography>

            <Typography paragraph sx={{ fontWeight: 500, mt: 2 }}>
              Customer support:
            </Typography>
            <Typography paragraph>
              We use information about you, information that we collect from within your account, information that you provide to our customer support team, and information about your interactions with the Service to resolve technical issues you experience with the Service, and to ensure that we can repair and improve the Service for all RecipeAssist users.
            </Typography>

            <Typography paragraph sx={{ fontWeight: 500, mt: 2 }}>
              For safety, security, fraud and abuse measures:
            </Typography>
            <Typography paragraph>
              We may use information about you, your activity, content, media uploads and related data in your account to prevent, detect, investigate and address safety, security, fraud and abuse risks, and to develop our algorithms and models to identify violations of this Privacy Policy, our Terms of Use or our Acceptable Use Policy.
            </Typography>

            <Typography paragraph sx={{ fontWeight: 500, mt: 2 }}>
              For matters that you have specifically consented to:
            </Typography>
            <Typography paragraph>
              From time to time RecipeAssist may seek your consent to use your information for a particular purpose. Where you consent to our doing so, we will use it for that purpose. Where you no longer want us to use your information for that purpose you may withdraw your consent to this use.
            </Typography>

            <Typography paragraph sx={{ fontWeight: 500, mt: 2 }}>
              For matters that we are required to use your information by law:
            </Typography>
            <Typography paragraph>
              RecipeAssist will use or disclose your information where we reasonably believe that such action is necessary to (a) comply with the law and the reasonable requests of law enforcement; (b) to enforce our Terms of Use or to protect the security or integrity of our Service; and/or (c) to exercise or protect the rights, property, or personal safety of RecipeAssist, our users or others.
            </Typography>

            <SummaryBox>
              RecipeAssist uses information about you for different reasons, including to provide, customize and improve the Service, for AI training, analytics, security, and to communicate with you.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              3. Sharing your information
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (a) How we share your information
            </Typography>
            <Typography paragraph>
              We share your information with RecipeAssist affiliates and third-party service providers for the purpose of providing the Service to you, to facilitate RecipeAssist's legitimate interests or if you consent. These parties are vetted by us, and will only be provided with access to your information as is reasonably necessary for the purpose that RecipeAssist has engaged that party. We require that such parties comply with applicable laws, and have security, privacy and data retention policies consistent with our policies to the extent necessary for them to perform a business or technology support function for us. These third-party service providers act as data processors under our instruction and are contractually bound to protect your data.
            </Typography>
            <Typography paragraph>
              Some of the parties with whom RecipeAssist may share your personal information assist RecipeAssist with functions such as: Authentication services (Supabase - see Supabase Privacy Policy at supabase.com/privacy); AI and machine learning services (OpenAI - see OpenAI Privacy Policy at openai.com/privacy, note that OpenAI's API services do not use your data for model training); Email services; Hosting and storage; Data analytics and predictive analytics (PostHog - used for internal performance tracking only, not third-party advertising); Data labeling and machine learning; Security and Service delivery; Marketing services; Payment processing; and other service providers.
            </Typography>

            <SummaryBox>
              We might share some information about you with our affiliates, business partners and third-party service providers in order to provide the Service to you or to fulfill RecipeAssist's legitimate business interests.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (b) How you can share your recipes
            </Typography>
            <Typography paragraph>
              When you add friends on RecipeAssist: Friends can view your shared recipes; You can view your friends' shared recipes; You can remove friends at any time. RecipeAssist collects your friend connections and they may be shared with service providers where required to provide the Services. By default, your recipes are private and only visible to you unless you explicitly share them with friends.
            </Typography>

            <SummaryBox>
              Our recipes are private by default. When sharing recipes with friends, they can view what you've explicitly shared with them.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (c) Sharing in connection with a merger, acquisition or reorganization
            </Typography>
            <Typography paragraph>
              RecipeAssist may also share, disclose or transfer your information to third parties in connection with or contemplation of (including as part of the due diligence process) any merger, acquisition, reorganization, financing, sale of assets, bankruptcy or insolvency event involving RecipeAssist or any portion of our assets, services or businesses. Information such as customer names and email addresses, User Content and other user information related to the Service may be among the items shared, disclosed or otherwise transferred in these types of transactions. You will be notified via email and/or a notice on the Service if such a transaction takes place. RecipeAssist does not sell personal information for monetary value to third-party data brokers or advertisers.
            </Typography>

            <SummaryBox>
              If we transfer our business, any of the info which we've acquired about you may be part of the transfer. We do not sell your personal information to data brokers.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (d) Sharing with other third parties
            </Typography>
            <Typography paragraph>
              RecipeAssist will also share your information with third parties in certain circumstances, such as where you consent to our sharing it with a third party for a particular purpose. You may choose to work with third-party products integrated into RecipeAssist or third-party applications from within RecipeAssist. Using third party products or integrating with third party applications could involve importing data from that third party to RecipeAssist and/or exporting data from RecipeAssist to that third party. These third-party products and apps are not controlled by us, and this privacy policy does not cover how third-party apps use your information. You should review the terms and conditions of any third party apps before connecting them to the Service.
            </Typography>

            <SummaryBox>
              We may share your data where you use third-party products or have integrated your use of RecipeAssist with third-party applications that are not controlled by us.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (e) Sharing aggregate data
            </Typography>
            <Typography paragraph>
              We may also aggregate or otherwise strip data of all personally identifying characteristics and may share that aggregated or anonymized data with third parties.
            </Typography>

            <SummaryBox>
              We may share anonymized data with third parties.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (f) Sharing with authorities
            </Typography>
            <Typography paragraph>
              We access, preserve and share your information with regulators, law enforcement, and others where we have a good-faith belief that it is necessary to detect, prevent or address fraud, breaches of our Terms of Use, harmful or illegal activity, to protect RecipeAssist (our rights, property or intellectual property), you or others, including as part of investigations or regulatory enquiries or to prevent death or imminent bodily harm.
            </Typography>

            <SummaryBox>
              We may share data with authorities where we feel it is necessary to comply with law or protect rights and safety.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              4. How we transfer, store and protect your data
            </Typography>
            <Typography paragraph>
              Your information collected through the Service will be stored and processed in the United States and any other country in which RecipeAssist or its subsidiaries, affiliates or service providers maintain facilities or employ staff or contractors. RecipeAssist transfers information that we collect about you, including personal information, to affiliated entities, and to other third parties across borders and from your country or jurisdiction to other countries or jurisdictions around the world. As a result, we may transfer information, including personal information, to a country and jurisdiction that does not have the same data protection laws as your jurisdiction. However, we always take steps to ensure that your information remains protected wherever it is stored and processed in accordance with applicable laws. Where required by law, including for transfers involving EU, UK, or Swiss data, we implement standard contractual clauses (SCCs), adequacy determinations, or equivalent safeguards to ensure adequate protection for transferred data in compliance with GDPR and other applicable data protection regulations.
            </Typography>

            <SummaryBox>
              To run our Service, we'll have to use our service providers around the world. This means your information might be transferred to the U.S. and anywhere else the Service is operated.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              5. Keeping your information safe
            </Typography>
            <Typography paragraph>
              RecipeAssist cares about the security of your information, and uses appropriate safeguards to preserve the integrity and security of all information collected through the Service. To protect your privacy and security, we take reasonable steps (such as requesting a unique password) to verify your identity before granting you access to your account. You are responsible for maintaining the secrecy of your unique password and account information, and for controlling access to your email communications from RecipeAssist, at all times. However, RecipeAssist cannot ensure or warrant the security of any information you transmit to RecipeAssist or guarantee that information on the Service may not be accessed, disclosed, altered, or destroyed. Your privacy settings may also be affected by changes to the functionality of third party sites and services that you add to the RecipeAssist Service, such as social networks. RecipeAssist is not responsible for the functionality or security measures of any third party.
            </Typography>

            <SummaryBox>
              We care about the safety of your data and have implemented industry recognized measures to protect it, but unfortunately we can't guarantee that nothing bad will ever happen to it.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              6. Your choices about your information
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (a) You control your account information and settings
            </Typography>
            <Typography paragraph>
              We provide choices about how we process your account information: You can manage the privacy preferences available to you by visiting your account settings and updating your preferences at any time; You can request access, correction or deletion of the data RecipeAssist holds on you by contacting privacy@recipebook.app; and You can opt out of receiving marketing messages by clicking on the "unsubscribe link" provided in such communications. However, you may not opt out of Service-related communications (e.g., account verification, transaction confirmations, changes/updates to features of the Service, technical and security notices).
            </Typography>

            <SummaryBox>
              You have control over your account settings, such as your account information and marketing email notifications, but there's some important stuff we'll always send you. If you have any questions about reviewing or modifying your account information, you can contact us directly at privacy@recipebook.app.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (b) Opting out of collection of your information through tracking technologies
            </Typography>
            <Typography paragraph>
              Please refer to your mobile device or browser's technical information for instructions on how to delete and disable cookies, and other tracking/recording tools. Depending on your type of device, it may not be possible to delete or disable tracking mechanisms on your mobile device. Note that disabling cookies and/or other tracking tools prevents RecipeAssist or its business partners from tracking your browser's activities in relation to the Service. However, doing so may disable many of the features available through the Service.
            </Typography>

            <SummaryBox>
              If you want us to stop collecting information about you through cookies, there may be some settings you can adjust in your browser or device. But RecipeAssist might not be personalized for you without it.
            </SummaryBox>

            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 1, fontSize: '0.9375rem' }}>
              (c) Rights in respect of your Information
            </Typography>
            <Typography paragraph>
              The laws of some countries grant particular rights in respect of personal information. Individuals in certain countries, including the European Union, United Kingdom, California and Brazil have the right to: Request access to their information; Request that we correct inaccuracies in their information; Request that their information be deleted or that we restrict access to it; Request a structured electronic version of their information; and Object to our use of their information. Should you wish to make a request in respect of your personal information please contact us at privacy@recipebook.app.
            </Typography>

            <SummaryBox>
              You may have specific rights in relation to your information depending on where you live. RecipeAssist provides you with controls in your account settings and you can access your privacy rights by emailing privacy@recipebook.app.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              7. How long we keep your information
            </Typography>
            <Typography paragraph>
              Following termination or deactivation of your user account, RecipeAssist will retain your profile information and User Content only for as long as we have a valid legal, business, or operational purpose to do so. In particular, RecipeAssist will retain your information for the purpose of complying with its legal and audit obligations, resolving disputes, enforcing our agreements, and for backup and archival purposes. Upon account deletion, we will delete your personal data within thirty (30) days, except where we are legally required to retain it (such as for tax, legal reporting, or audit purposes). Aggregated or anonymized data that does not identify you personally may be retained indefinitely for analytics and service improvement purposes.
            </Typography>

            <SummaryBox>
              We retain your profile information and user content for the purpose of providing our Service to you and to comply with our legal and regulatory obligations.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              8. Children's Privacy
            </Typography>
            <Typography paragraph>
              RecipeAssist is not intended for users under 16 years of age (or the minimum legal age in your jurisdiction, whichever is higher). We do not knowingly collect or solicit personal information from children under 16 without parental consent. In jurisdictions where the age of digital consent is 13 (such as the United States under COPPA), we require users to be at least 13 years old. For users in the European Union, United Kingdom, and other jurisdictions where the age of digital consent is 16, we require users to be at least 16 years old or to have verifiable parental consent. If we learn that we have collected personal information from a child under the applicable age threshold without verification of parental consent where this is required, we will delete that information as quickly as possible. If you believe that we might have any information from or about a child who does not meet the age requirements, please contact us immediately at privacy@recipebook.app.
            </Typography>

            <SummaryBox>
              Our Service is not intended for children under 16 (or under 13 in the U.S.). Parental consent is required for minors in certain jurisdictions. We do not knowingly collect information from children without proper consent.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              9. Links to other websites and services
            </Typography>
            <Typography paragraph>
              We are not responsible for the practices employed by websites or services linked to or from the Service, including the information or content contained therein. Please remember that when you use a link to go from the Service to another website, our Privacy Policy does not apply to third-party websites or services. Your browsing and interaction on any third-party website or service, including those that have a link or advertisement on our website, are subject to that third party's own rules and policies. In addition, you acknowledge that we are not responsible for and we do not exercise control over any third parties that you authorize to access your User Content. If you are using a third-party website or service and you allow such a third party access to your User Content you do so at your own risk.
            </Typography>

            <SummaryBox>
              If we post a link to a third party website on RecipeAssist, we can't control what happens on the other end. The same applies if you let another site use your data on RecipeAssist; the use of your information will be governed by the Privacy Policy of the third party.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              10. Changes to this Policy
            </Typography>
            <Typography paragraph>
              We may update this policy from time to time to reflect our current practice and ensure compliance with applicable laws. When we post changes to this policy, we will revise the "Last Updated" date at the top of this policy. If we make any material changes to the way we collect, use, store and/or share your personal information, we will notify you on our website or by sending an email to the email address associated with your RecipeAssist account. We recommend that you check this page from time to time to inform yourself of any changes.
            </Typography>

            <SummaryBox>
              We won't make any major changes to our Privacy Policy without giving notice – but it's still a good idea to visit this page every now and then.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              11. Data Breach Notification
            </Typography>
            <Typography paragraph>
              In the event of a data breach that affects your personal information, we will notify you and relevant authorities as required by applicable law. We will provide notice without undue delay and, where feasible, within 72 hours of becoming aware of the breach. Our notification will include information about the nature of the breach, the types of data affected, the potential consequences, and the measures we have taken or propose to take to address the breach and mitigate potential adverse effects.
            </Typography>

            <SummaryBox>
              If a data breach affects your information, we will notify you and authorities as required by law, typically within 72 hours of discovery.
            </SummaryBox>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 1.5, fontSize: '1rem' }}>
              12. How to contact us
            </Typography>
            <Typography paragraph>
              If you have any questions about this Privacy Policy or the Service, or wish to make a complaint, exercise your privacy rights, or request access to, correction of, or deletion of your data, please contact us at:
            </Typography>
            <Typography paragraph>
              Email: privacy@recipebook.app
            </Typography>
            <Typography paragraph>
              Write:
            </Typography>
            <Typography paragraph sx={{ ml: 2 }}>
              Privacy Officer<br />
              RecipeAssist, Inc.<br />
              1234 Recipe Lane, Suite 100<br />
              San Francisco, CA 94102<br />
              United States
            </Typography>
            <Typography paragraph>
              For users in the European Economic Area (EEA), United Kingdom, or Switzerland, our designated representative for GDPR inquiries can be contacted at the above address.
            </Typography>

            <SummaryBox>
              Your privacy is important to us and we are happy to answer any questions you may have. You can reach us by email or mail.
            </SummaryBox>
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
              onClick={() => router.push('/terms')}
            >
              Terms of Service
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              © {new Date().getFullYear()} RecipeAssist
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
