# Suivi muscu

Application web installable (PWA) pour suivre un programme de musculation de 31 semaines : séances avec chrono de repos, progression, bilan de fatigue, mensurations et carte musculaire.

Chaque utilisateur crée son profil (prénom, sexe, taille, date de début) au premier lancement. Les données restent sur son téléphone (localStorage) : penser à exporter régulièrement depuis l'onglet Profile.

Un programme personnalisé s'importe depuis Profile › Programme. Format décrit dans [FORMAT-PROGRAMME.md](FORMAT-PROGRAMME.md).

- Tests de la logique : `node logic.test.js`
- Tracés anatomiques : [react-muscle-highlighter](https://github.com/soroojshehryar/react-muscle-highlighter) (MIT), voir `body-data.js`
- Polices : Barlow et Barlow Condensed (SIL Open Font License)
