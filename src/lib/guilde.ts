// ---------- La guilde d'Interter : un personnage par thème ----------
// Les thèmes structurent la banque de questions ; les formats
// (qcm, devinette...) sont la manière de jouer chaque thème.
// Le prénom rime avec le métier (Yolande la Marchande, Aaron le Forgeron…).
// Un personnage illustré a trois portraits : pendant la question, après une
// bonne réponse, après une erreur. Les autres gardent leur dessin provisoire.
// Comme dans un parcours GeoGaming, chaque épreuve réussie rapporte un objet.
export type Hote = {
  nom: string;
  svg?: string;
  portraits?: { question: string; bravo: string; oups: string };
  intro: string;
  // Ce qu'il confie au joueur qui réussit : le trésor de la Quête
  objet: string;
};
export const GUILDE: Record<string, Hote> = {
  quotidien: {
    nom: "Yolande la Marchande",
    portraits: {
      question: "/personnages/yolande-question.webp",
      bravo: "/personnages/yolande-bravo.webp",
      oups: "/personnages/yolande-oups.webp",
    },
    intro: "Yolande étale ses marchandises devant toi :",
    objet: "une pièce d'or de son étal",
  },
  histoire: {
    nom: "Gabrielli le Bailli",
    portraits: {
      question: "/personnages/gabrielli-question.webp",
      bravo: "/personnages/gabrielli-bravo.webp",
      oups: "/personnages/gabrielli-oups.webp",
    },
    intro: "Gabrielli te demande de trancher :",
    objet: "le sceau du bailliage",
  },
  legendes: {
    nom: "La Conteuse",
    portraits: {
      question: "/personnages/conteuse-question.webp",
      bravo: "/personnages/conteuse-bravo.webp",
      oups: "/personnages/conteuse-oups.webp",
    },
    intro: "La Conteuse ouvre son grand livre :",
    objet: "une page de son grand livre",
  },
  armes: {
    nom: "Aaron le Forgeron",
    portraits: {
      question: "/personnages/aaron-question.webp",
      bravo: "/personnages/aaron-bravo.webp",
      oups: "/personnages/aaron-oups.webp",
    },
    intro: "Aaron frappe son enclume, écoute bien :",
    objet: "un fer forgé à la main",
  },
  cuisine: {
    nom: "Yvonne la Marmitonne",
    // Pas encore de portrait joyeux : elle salue aussi pour féliciter
    portraits: {
      question: "/personnages/yvonne-question.webp",
      bravo: "/personnages/yvonne-question.webp",
      oups: "/personnages/yvonne-oups.webp",
    },
    intro: "Yvonne vide son panier sur la table :",
    objet: "sa cuillère en bois",
  },
  chroniques: {
    nom: "Étienne le Greffier",
    svg: "/personnages/etienne-greffier.svg",
    intro: "Étienne relit les registres de la ville :",
    objet: "un feuillet des registres",
  },
  geographie: {
    nom: "Berthe la Cartographe",
    svg: "/personnages/berthe-cartographe.svg",
    intro: "Berthe déplie ses cartes :",
    objet: "une carte ancienne",
  },
  fetes: {
    nom: "Jehanne la Ménestrelle",
    svg: "/personnages/jehanne-menestrelle.svg",
    intro: "Jehanne accorde son luth :",
    objet: "une corde de son luth",
  },
  nature: {
    nom: "Aldric le Fauconnier",
    svg: "/personnages/aldric-fauconnier.svg",
    intro: "Aldric pose son faucon sur le gant :",
    objet: "une plume de faucon",
  },
  sciences: {
    nom: "Pons le Barbier-Chirurgien",
    svg: "/personnages/pons-barbier.svg",
    intro: "Pons aiguise ses instruments :",
    objet: "un flacon d'onguent",
  },
};
