import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

const translations = {
  en: {
    nav: {
      home: "Home",
      submit: "Submit",
      track: "Track",
      dashboard: "Dashboard",
      login: "Login",
      logout: "Logout",
      brand: "PostBox"
    },
    common: {
      back: "Back",
      next: "Next",
      copy: "Copy",
      copied: "Token copied!",
      remove: "Remove",
      upload: "Click or drag & drop files here",
      success: "Success",
      clear: "Clear",
      saveChanges: "Save Changes",
      pageOf: "Page {page} of {totalPages}"
    },
    status: {
      UNREAD: "Unread",
      UNDER_REVIEW: "Under Review",
      IN_PROGRESS: "In Progress",
      ESCALATED: "Escalated to Chairman",
      RESOLVED: "Resolved",
      REJECTED: "Rejected",
      PENDING: "Pending",
      PROCESSING: "Processing",
      VERIFIED: "Verified",
      FAILED: "Failed"
    },
    priority: {
      LOW: "Low",
      MEDIUM: "Medium",
      HIGH: "High",
      URGENT: "Urgent"
    },
    home: {
      secureAnonymous: "Secure & Anonymous",
      titlePart1: "Your Voice Matters.",
      titlePart2: " Make It Heard.",
      subtitle: "Smart Union Postbox empowers citizens to file complaints with their Union Parishad — anonymously or with NID verification. Track progress in real-time.",
      submitCTA: "Submit a Complaint",
      trackCTA: "Track Your Complaint",
      howItWorks: "How It Works",
      threeSteps: "Three simple steps to make your voice heard",
      step1Title: "Submit Your Complaint",
      step1Desc: "Fill out a simple form with your complaint details. Choose to remain anonymous or verify with your NID for faster processing.",
      step2Title: "Track Progress",
      step2Desc: "Receive a unique tracking token. Use it anytime to check the current status and see the full timeline of your complaint.",
      step3Title: "Get Resolution",
      step3Desc: "Your Union Parishad reviews and acts on complaints. The Chairman handles escalated issues for faster resolution.",
      feature1Title: "Fully Anonymous",
      feature1Desc: "Your identity is protected. No registration needed.",
      feature2Title: "NID Verification",
      feature2Desc: "Verify with your National ID for priority processing.",
      feature3Title: "Real-time Updates",
      feature3Desc: "Track your complaint status live, anytime.",
      feature4Title: "Instant Notifications",
      feature4Desc: "Admin dashboard receives real-time alerts.",
      copyright: "Smart Union Postbox. Built for the people of Bangladesh."
    },
    submit: {
      titlePart1: "Submit a ",
      titlePart2: "Complaint",
      subtitle: "Fill in the details below. Your complaint will be reviewed by your Union Parishad.",
      stepDetails: "Details",
      stepIdentity: "Identity",
      stepAttachments: "Attachments",
      stepReview: "Review",
      labelUP: "Union Parishad",
      placeholderUP: "Select a Union Parishad…",
      labelSubject: "Subject",
      placeholderSubject: "Brief subject of your complaint…",
      labelDesc: "Description",
      placeholderDesc: "Describe your complaint in detail…",
      identityTitle: "How would you like to submit?",
      identityAnonTitle: "🕶️ Anonymous",
      identityAnonDesc: "Your identity will remain completely private. No registration required.",
      identityNidTitle: "🪪 NID Verification",
      identityNidDesc: "Verify with your National ID for priority processing and an auto-generated account.",
      nidUploadLabel: "Upload NID Card Photo",
      nidUploaded: "NID image uploaded",
      nidUploadZone: "Click or drag & drop your NID card photo",
      nidUploadHelp: "JPEG, PNG, or WebP (max 10 MB)",
      attachTitle: "Attach Evidence (Optional)",
      attachDesc: "Upload photos, documents, or any evidence related to your complaint.",
      attachHelp: "Up to 5 files — JPEG, PNG, WebP, PDF (max 10 MB each)",
      reviewTitle: "Review Your Complaint",
      reviewType: "Submission Type",
      reviewAttachments: "Attachments",
      reviewFiles: "file(s)",
      successTitle: "Complaint Submitted!",
      successMessage: "Your complaint has been received. Use the tracking token below to check your status anytime.",
      successTrack: "Track My Complaint",
      successHome: "Back to Home",
      btnSubmit: "Submit Complaint",
      maxAttachments: "Maximum 5 attachments allowed",
      adminRestriction: "Administrators and higher-level users cannot submit complaints."
    },
    track: {
      titlePart1: "Track Your ",
      titlePart2: "Complaint",
      subtitle: "Enter your tracking token to see the current status of your complaint.",
      placeholderToken: "Enter your tracking token (UUID)…",
      btnTrack: "Track",
      submitted: "Submitted",
      resolvedOn: "Resolved on",
      attachments: "Attachments",
      nidStatus: "NID Status",
      timeline: "Status Timeline",
      from: "From",
      by: "By",
      empty: "No complaint found. Please double-check your tracking token."
    },
    login: {
      welcomeBack: "Welcome Back",
      signInSubtitle: "Sign in to your PostBox account",
      username: "Username",
      password: "Password",
      placeholderUsername: "Enter your username",
      placeholderPassword: "Enter your password",
      signInBtn: "Sign In",
      dontHaveAccount: "Don't have an account?",
      nidHelp: "Submit a complaint with NID verification to get one automatically."
    },
    sidebar: {
      overview: "Overview",
      complaints: "Complaints",
      chairman: "👑 Chairman",
      upMember: "🏛️ UP Member",
      alertsActive: "Real-time alerts active"
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Overview of complaint statistics",
      totalComplaints: "Total Complaints",
      unread: "Unread",
      inProgress: "In Progress",
      resolved: "Resolved",
      byStatus: "By Status",
      byPriority: "By Priority",
      submissionSource: "Submission Source",
      anonymous: "Anonymous",
      verified: "Verified",
      noData: "No data available"
    },
    cl: {
      header: "Complaints",
      subtitle: "Manage all submitted complaints",
      refresh: "Refresh",
      filter: "Filter",
      status: "Status",
      priority: "Priority",
      source: "Source",
      allStatuses: "All Statuses",
      allPriorities: "All Priorities",
      allSources: "All Sources",
      anonymous: "Anonymous",
      verified: "Verified",
      clearFilters: "Clear Filters",
      noComplaints: "No complaints found",
      subject: "Subject",
      complainant: "Complainant",
      date: "Date",
      previous: "Previous",
      next: "Next",
      pageOf: "Page {page} of {totalPages}"
    },
    cd: {
      back: "Back to Complaints",
      title: "Complaint Details",
      complainant: "Complainant",
      trackingToken: "Tracking Token",
      nidVerification: "NID Verification",
      extractedName: "Extracted Name",
      jurisdictionMatch: "Jurisdiction Match",
      yes: "Yes",
      no: "No",
      error: "Error",
      adminActions: "Admin Actions",
      updateStatus: "Update Status",
      statusChangeNotes: "Status Change Notes",
      statusPlaceholder: "Reason for status change…",
      internalNotes: "Internal Notes",
      internalPlaceholder: "Notes visible only to admin…",
      statusLogs: "Status History"
    }
  },
  bn: {
    nav: {
      home: "হোম",
      submit: "অভিযোগ জমা",
      track: "ট্র্যাক",
      dashboard: "ড্যাশবোর্ড",
      login: "লগইন",
      logout: "লগআউট",
      brand: "পোস্টবক্স"
    },
    common: {
      back: "পূর্ববর্তী",
      next: "পরবর্তী",
      copy: "কপি করুন",
      copied: "টোকেন কপি করা হয়েছে!",
      remove: "মুছে ফেলুন",
      upload: "ক্লিক করুন অথবা ফাইল ড্র্যাগ করে ছেড়ে দিন",
      success: "সফল",
      clear: "মুছুন",
      saveChanges: "পরিবর্তন সংরক্ষণ করুন",
      pageOf: "পৃষ্ঠা {page} / {totalPages}"
    },
    status: {
      UNREAD: "অপঠিত",
      UNDER_REVIEW: "পর্যালোচনারাধীন",
      IN_PROGRESS: "চলমান",
      ESCALATED: "চেয়ারম্যানের নিকট প্রেরিত",
      RESOLVED: "সমাধানকৃত",
      REJECTED: "প্রত্যাখ্যাত",
      PENDING: "পেন্ডিং",
      PROCESSING: "প্রসেসিং",
      VERIFIED: "যাচাইকৃত",
      FAILED: "ব্যর্থ"
    },
    priority: {
      LOW: "নিম্ন",
      MEDIUM: "মাঝারি",
      HIGH: "উচ্চ",
      URGENT: "জরুরি"
    },
    home: {
      secureAnonymous: "নিরাপদ ও বেনামী",
      titlePart1: "আপনার মতামত গুরুত্বপূর্ণ।",
      titlePart2: " আওয়াজ তুলুন।",
      subtitle: "স্মার্ট ইউনিয়ন পোস্টবক্স নাগরিকদের তাদের ইউনিয়ন পরিষদে অভিযোগ দায়ের করতে সহায়তা করে — বেনামে বা জাতীয় পরিচয়পত্র (NID) যাচাইকরণের মাধ্যমে। রিয়েল-টাইমে অগ্রগতির ট্র্যাক রাখুন।",
      submitCTA: "অভিযোগ জমা দিন",
      trackCTA: "অভিযোগ ট্র্যাক করুন",
      howItWorks: "কার্যপ্রণালী",
      threeSteps: "আপনার কথা পৌঁছে দেওয়ার ৩টি সহজ ধাপ",
      step1Title: "অভিযোগ জমা দিন",
      step1Desc: "অভিযোগের বিবরণ দিয়ে একটি সহজ ফর্ম পূরণ করুন। বেনামে অভিযোগ করতে পারেন অথবা দ্রুত সমাধানের জন্য জাতীয় পরিচয়পত্র দিয়ে যাচাই করুন।",
      step2Title: "অগ্রগতি ট্র্যাক করুন",
      step2Desc: "একটি অনন্য ট্র্যাকিং টোকেন পাবেন। যেকোনো সময় অভিযোগের বর্তমান অবস্থা এবং সম্পূর্ণ টাইমলাইন দেখতে এটি ব্যবহার করুন।",
      step3Title: "সমাধান পান",
      step3Desc: "আপনার ইউনিয়ন পরিষদ অভিযোগ পর্যালোচনা করে ব্যবস্থা নেয়। দ্রুত সমাধানের জন্য চেয়ারম্যান সরাসরি বিশেষ অভিযোগগুলো পরিচালনা করেন।",
      feature1Title: "সম্পূর্ণ বেনামী",
      feature1Desc: "আপনার পরিচয় সম্পূর্ণ সুরক্ষিত থাকবে। কোনো নিবন্ধনের প্রয়োজন নেই।",
      feature2Title: "এনআইডি যাচাইকরণ",
      feature2Desc: "অগ্রাধিকার ভিত্তিতে কাজ সম্পন্নের জন্য আপনার জাতীয় পরিচয়পত্র যাচাই করুন।",
      feature3Title: "রিয়েল-টাইম আপডেট",
      feature3Desc: "যেকোনো সময় সরাসরি আপনার অভিযোগের অবস্থা ট্র্যাক করুন।",
      feature4Title: "তাৎক্ষণিক নোটিফিকেশন",
      feature4Desc: "অ্যাডমিন ড্যাশবোর্ড রিয়েল-টাইম অ্যালার্ট পেয়ে থাকে।",
      copyright: "স্মার্ট ইউনিয়ন পোস্টবক্স। বাংলাদেশের জনগণের জন্য তৈরি।"
    },
    submit: {
      titlePart1: "অভিযোগ ",
      titlePart2: "দাখিল করুন",
      subtitle: "নিচের ফর্মটি পূরণ করুন। আপনার অভিযোগটি সংশ্লিষ্ট ইউনিয়ন পরিষদ পর্যালোচনা করবে।",
      stepDetails: "বিবরণ",
      stepIdentity: "পরিচয়",
      stepAttachments: "সংযুক্তি",
      stepReview: "পর্যালোচনা",
      labelUP: "ইউনিয়ন পরিষদ",
      placeholderUP: "ইউনিয়ন পরিষদ নির্বাচন করুন...",
      labelSubject: "বিষয়",
      placeholderSubject: "অভিযোগের সংক্ষিপ্ত বিষয়...",
      labelDesc: "বিস্তারিত বিবরণ",
      placeholderDesc: "অভিযোগের বিস্তারিত বিবরণ লিখুন...",
      identityTitle: "আপনি কিভাবে অভিযোগ জমা দিতে চান?",
      identityAnonTitle: "🕶️ বেনামী",
      identityAnonDesc: "আপনার পরিচয় সম্পূর্ণ গোপন থাকবে। কোনো নিবন্ধনের প্রয়োজন নেই।",
      identityNidTitle: "🪪 এনআইডি যাচাইকরণ",
      identityNidDesc: "অগ্রাধিকার ভিত্তিতে প্রসেসিং এবং স্বয়ংক্রিয় অ্যাকাউন্ট তৈরির জন্য জাতীয় পরিচয়পত্র যাচাই করুন।",
      nidUploadLabel: "জাতীয় পরিচয়পত্রের ছবি আপলোড করুন",
      nidUploaded: "জাতীয় পরিচয়পত্রের ছবি আপলোড করা হয়েছে",
      nidUploadZone: "এখানে ক্লিক করুন অথবা আপনার জাতীয় পরিচয়পত্রের ছবি ড্র্যাগ করে ছেড়ে দিন",
      nidUploadHelp: "জেপিজি, পিএনজি অথবা ওয়েবপি (সর্বোচ্চ ১০ এমবি)",
      attachTitle: "প্রমাণ সংযুক্ত করুন (ঐচ্ছিক)",
      attachDesc: "আপনার অভিযোগের সাথে সম্পর্কিত ছবি, নথি বা যেকোনো প্রমাণ আপলোড করুন।",
      attachHelp: "সর্বোচ্চ ৫টি ফাইল — জেপিজি, পিএনজি, ওয়েবপি, পিডিএফ (প্রতিটি সর্বোচ্চ ১০ এমবি)",
      reviewTitle: "আপনার অভিযোগ পর্যালোচনা করুন",
      reviewType: "অভিযোগের ধরণ",
      reviewAttachments: "সংযুক্তিসমূহ",
      reviewFiles: "টি ফাইল",
      successTitle: "অভিযোগ সফলভাবে জমা দেওয়া হয়েছে!",
      successMessage: "আপনার অভিযোগটি গৃহীত হয়েছে। যেকোনো সময় অবস্থা জানতে নিচের ট্র্যাকিং টোকেনটি ব্যবহার করুন।",
      successTrack: "অভিযোগ ট্র্যাক করুন",
      successHome: "হোম পেজে ফিরে যান",
      btnSubmit: "অভিযোগ দাখিল করুন",
      maxAttachments: "সর্বোচ্চ ৫টি ফাইল আপলোড করা যাবে",
      adminRestriction: "প্রশাসক এবং উচ্চস্তরের ব্যবহারকারীগণ অভিযোগ দাখিল করতে পারবেন না।"
    },
    track: {
      titlePart1: "আপনার ",
      titlePart2: "অভিযোগটি ট্র্যাক করুন",
      subtitle: "আপনার অভিযোগের বর্তমান অবস্থা দেখতে ট্র্যাকিং টোকেনটি প্রবেশ করান।",
      placeholderToken: "আপনার ট্র্যাকিং টোকেন (UUID) লিখুন...",
      btnTrack: "অনুসন্ধান",
      submitted: "দাখিলকৃত",
      resolvedOn: "সমাধানের তারিখ",
      attachments: "সংযুক্তিসমূহ",
      nidStatus: "এনআইডি অবস্থা",
      timeline: "অগ্রগতির টাইমলাইন",
      from: "পূর্ববর্তী অবস্থা",
      by: "কর্তৃক",
      empty: "কোনো অভিযোগ পাওয়া যায়নি। অনুগ্রহ করে আপনার ট্র্যাকিং টোকেনটি পুনরায় যাচাই করুন।"
    },
    login: {
      welcomeBack: "স্বাগতম",
      signInSubtitle: "আপনার পোস্টবক্স অ্যাকাউন্টে সাইন ইন করুন",
      username: "ব্যবহারকারীর নাম (Username)",
      password: "পাসওয়ার্ড",
      placeholderUsername: "আপনার ব্যবহারকারীর নাম লিখুন",
      placeholderPassword: "আপনার পাসওয়ার্ড লিখুন",
      signInBtn: "সাইন ইন",
      dontHaveAccount: "অ্যাকাউন্ট নেই?",
      nidHelp: "স্বয়ংক্রিয় অ্যাকাউন্ট পেতে আপনার জাতীয় পরিচয়পত্র যাচাইকরণের মাধ্যমে অভিযোগ জমা দিন।"
    },
    sidebar: {
      overview: "সংক্ষিপ্ত বিবরণ",
      complaints: "অভিযোগসমূহ",
      chairman: "👑 চেয়ারম্যান",
      upMember: "🏛️ ইউপি সদস্য",
      alertsActive: "রিয়েল-টাইম অ্যালার্ট সচল"
    },
    dashboard: {
      title: "ড্যাশবোর্ড",
      subtitle: "অভিযোগ পরিসংখ্যানের সংক্ষিপ্ত বিবরণ",
      totalComplaints: "মোট অভিযোগ",
      unread: "অপঠিত",
      inProgress: "চলমান",
      resolved: "সমাধানকৃত",
      byStatus: "অবস্থা অনুযায়ী",
      byPriority: "অগ্রাধিকার অনুযায়ী",
      submissionSource: "অভিযোগের উৎস",
      anonymous: "বেনামী",
      verified: "যাচাইকৃত",
      noData: "কোনো তথ্য পাওয়া যায়নি"
    },
    cl: {
      header: "অভিযোগসমূহ",
      subtitle: "দাখিলকৃত সকল অভিযোগ পরিচালনা করুন",
      refresh: "রিফ্রেশ করুন",
      filter: "ফিল্টার",
      status: "অবস্থা",
      priority: "অগ্রাধিকার",
      source: "উৎস",
      allStatuses: "সকল অবস্থা",
      allPriorities: "সকল অগ্রাধিকার",
      allSources: "সকল উৎস",
      anonymous: "বেনামী",
      verified: "যাচাইকৃত",
      clearFilters: "ফিল্টার মুছুন",
      noComplaints: "কোনো অভিযোগ পাওয়া যায়নি",
      subject: "বিষয়",
      complainant: "অভিযোগকারী",
      date: "তারিখ",
      previous: "পূর্ববর্তী",
      next: "পরবর্তী",
      pageOf: "পৃষ্ঠা {page} / {totalPages}"
    },
    cd: {
      back: "অভিযোগ তালিকায় ফিরে যান",
      title: "অভিযোগের বিবরণ",
      complainant: "অভিযোগকারী",
      trackingToken: "ট্র্যাকিং টোকেন",
      nidVerification: "এনআইডি যাচাইকরণ",
      extractedName: "উদ্ধৃত নাম",
      jurisdictionMatch: "এলাকার মিল",
      yes: "হ্যাঁ",
      no: "না",
      error: "ত্রুটি",
      adminActions: "অ্যাডমিন অ্যাকশন",
      updateStatus: "অবস্থা পরিবর্তন",
      statusChangeNotes: "অবস্থা পরিবর্তনের নোট",
      statusPlaceholder: "অবস্থা পরিবর্তনের কারণ লিখুন...",
      internalNotes: "অভ্যন্তরীণ নোট",
      internalPlaceholder: "শুধুমাত্র অ্যাডমিন দেখতে পাবেন...",
      statusLogs: "অগ্রগতির ইতিহাস"
    }
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'bn'; // Default to Bangla for Smart Union Postbox
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      if (!value || typeof value !== 'object') return key;
      value = value[k];
    }
    return value || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'bn' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
