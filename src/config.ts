import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://ujjwalojha.com.np/blog/",
  author: "Ujjwal Ojha",
  profile: "https://www.linkedin.com/in/ujjwal-ojha/",
  desc: "",
  title: "Ujjwal Ojha",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 3,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
};

export const LOCALE = {
  lang: "en", // html lang code. Set this empty and default will be "en"
  langTag: ["en-EN"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/ojhaujjwal",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/ujjwal-ojha/",
    linkTitle: `${SITE.title} on LinkedIn`,
    active: true,
  },
  {
    name: "Twitter",
    href: "https://x.com/ojhaujjwal",
    linkTitle: `${SITE.title} on Twitter`,
    active: true,
  },
];
