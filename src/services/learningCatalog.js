// Curated demo catalog — a static, hardcoded list, NOT user-entered and NOT
// a database table. Mentors pick from this fixed list when recommending
// learning to a connection; only the resulting recommendation (who, what,
// when, status) is real data, stored in Supabase's learning_recommendations
// table (see supabase/migrations/0006_learning_recommendations.sql).
export const LEARNING_CATALOG = [
  {
    id: "active-supervision",
    title: "Active Supervision Keeps Kids Safe",
    skillCategory: "Child Safety, Health & Wellbeing",
    materialType: "Video",
    resourceLink: "https://www.youtube.com/watch?v=vheeQM4DyzM",
  },
  {
    id: "health-safety-basics",
    title: "Health & Safety Basics for Early Childhood Professionals",
    skillCategory: "Child Safety, Health & Wellbeing",
    materialType: "Video",
    resourceLink: "https://www.youtube.com/watch?v=BsjVLM3rXGw",
  },
  {
    id: "notice-join-extend",
    title: "Notice, Join, Extend: Teaching Through Play",
    skillCategory: "Child Development & Early Learning",
    materialType: "Video",
    resourceLink: "https://www.youtube.com/watch?v=0uLPab8Jlzc",
  },
  {
    id: "start-daycare-business",
    title: "How to Start Day Care Centre Business Step by Step",
    skillCategory: "ELP Business, Money & Leadership",
    materialType: "Video",
    resourceLink: "https://www.youtube.com/watch?v=6um1znVbFsc",
  },
  {
    id: "small-business-budgeting",
    title:
      "Small Business Budgeting Simplified: How to Create a Budget for Your Small Business",
    skillCategory: "ELP Business, Money & Leadership",
    materialType: "Video",
    resourceLink: "https://www.youtube.com/watch?v=P01e-SYxRts&t=213s",
  },
  {
    id: "curriculum-lesson-planning",
    title: "Curriculum and Lesson Planning in Early Childhood Education",
    skillCategory: "Teaching Practice & Learning Activities",
    materialType: "Video",
    resourceLink: "https://www.youtube.com/watch?v=BrQyxe5co5c",
  },
  {
    id: "ece-teaching-strategies",
    title: "Early Childhood Education Teaching Strategies",
    skillCategory: "Teaching Practice & Learning Activities",
    materialType: "Video",
    resourceLink: "https://www.youtube.com/watch?v=9152_f1FyAQ",
  },
  {
    id: "nutrition-brain-development",
    title: "How Nutrition Impacts a Child's Brain Development",
    skillCategory: "Child Safety, Health & Wellbeing",
    materialType: "Video",
    resourceLink: "https://www.youtube.com/watch?v=uOe_IKkA-CM",
  },
  {
    id: "effective-communication-families",
    title: "Effective Communication with Families",
    skillCategory: "Family & Community Engagement",
    materialType: "Video",
    resourceLink: "https://www.youtube.com/watch?v=pg4o6N9Lm-c",
  },
  {
    id: "effective-communication-ece-teacher",
    title: "Effective Communication for the ECE Teacher",
    skillCategory: "Family & Community Engagement",
    materialType: "Video",
    resourceLink: "https://www.youtube.com/watch?v=hk-Vr10Hvvg",
  },
];
