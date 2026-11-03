// Edit developer names, roles, images and social links below.
// Images: put a file in public/images and use "/images/your-photo.webp".
// Set image to "" for initials. Omit a social link or set it to "" to hide it.
// Add/remove whole developer entries freely; keep each id unique.
export type Developer = {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  socials: Partial<Record<"github" | "facebook" | "instagram", string>>;
};

export const developers: Developer[] = [
  {
    id: "developer-1",
    name: "Eryck Jouhann V. Cadawas",
    role: "Decepticon",
    bio: "Focused on the frontend experience and the interfaces readers use every day.",
    image: "/images/hojan.webp",
    socials: {
      github: "https://github.com/Hojannn",
      facebook: "https://www.facebook.com/jouhanncadawas",
      instagram: "https://www.instagram.com/hojaaann/?hl=en",
    },
  },
  {
    id: "developer-2",
    name: "Carl Jasper A. Ramos",
    role: "Backshot Developer",
    bio: "Works on the backend, data, and the services that keep the library running.",
    image: "/images/cj.webp",
    socials: {
      github: "https://github.com/zora-ao",
      facebook: "https://www.facebook.com/carljaspera.ramos",
      instagram: "https://www.instagram.com/crldkl/",
    },
  },
  {
    id: "developer-3",
    name: "Dolf Louise P. Felipe",
    role: "Project Demo (Demolition)",
    bio: "Helps shape and demonstrate the project from concept to working demo.",
    image: "/images/dolf.webp",
    socials: {
      github: "https://github.com/aintlumii",
      facebook: "https://www.facebook.com/dolflouise.felipe",
      instagram: "https://www.instagram.com/aintlumi_/",
    },
  },
];

export const aboutContent = {
  eyebrow: "ABOUT PAHINA",
  title: ["Your campus library,", "a little closer."],
  description: "Pahina makes it easier to discover books, keep track of your borrows, and save the titles you want to read next—all in one place.",
  featuresTitle: "A simpler way to use your library",
  features: [
    { title: "Find your next read", description: "Browse the catalog, search for a title, and check book details and availability." },
    { title: "Stay on top of your borrows", description: "See due dates, overdue books, and your borrowing history in one clear view." },
    { title: "Keep your favorites close", description: "Save books for later and share your thoughts through ratings and reviews." },
  ],
  developersTitle: "Meet the developers",
  developersDescription: "The team building a better library experience.",
  footer: "Built to help students, librarians, and administrators stay connected to their library.",
};
