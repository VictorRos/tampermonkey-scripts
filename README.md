# Scripts Tampermonkey

Collection de scripts Tampermonkey pour améliorer l'expérience utilisateur sur différentes plateformes.

## Liste des scripts

### Azure DevOps

- **[Auto Close SonarCloud PR Comments](#auto-close-sonarcloud-pr-comments)** - [📥 Installer depuis GreasyFork][greasyfork-sonarcloud]
- **[ADO Build & Deploy - Viewer+](#ado-build--deploy---viewer)** - [📥 Installer depuis GreasyFork][greasyfork-build-viewer]

### RHPI

- **[RHPI+](#rhpi)** - [📥 Installer depuis GreasyFork][greasyfork-rhpi]

---

## RHPI+

**Fichier:** `rhpi/rhpi-plus.user.js`

**📥 [Installer depuis GreasyFork][greasyfork-rhpi]**

### À quoi ça sert ?

Ce script ajoute des couleurs dans votre tableau de bord des congés RHPI pour mieux distinguer les différents types d'événements.

### Où ça fonctionne ?

Sur la page de planning des absences dans RHPI (l'URL contient `webplace/ceg.jsp`).

### Que fait-il concrètement ?

- **Colore les événements** dans le calendrier :
  - 🔵 **Bleu** pour les congés payés
  - 🟣 **Violet** pour les jours de repos
  - 🟠 **Orange** pour le télétravail

- **Ajoute une légende** en haut de la page pour comprendre rapidement ce que signifient les couleurs

### Comment l'utiliser ?

Une fois installé, le script fonctionne automatiquement. Il suffit d'aller sur la page de planning des absences et les couleurs apparaissent tout seules !

---

## Auto Close SonarCloud PR Comments

**Fichier:** `azure-devops/auto-close-sonar-cloud-pr-comments.user.js`

**📥 [Installer depuis GreasyFork][greasyfork-sonarcloud]**

### À quoi ça sert ?

Ce script vous aide à fermer rapidement tous les commentaires SonarQube qui sont encore "ouverts" sur une Pull Request dans Azure DevOps.

### Où ça fonctionne ?

Sur les pages de Pull Request dans Azure DevOps (l'URL ressemble à `dev.azure.com/.../pullrequest/...`).

### Que fait-il concrètement ?

- **Ajoute un bouton** "Close SonarCloud Comments" dans la barre d'outils en haut de la page
- Quand vous cliquez sur ce bouton, le script :
  - Trouve tous les commentaires SonarQube qui sont encore "ouverts"
  - Les ferme automatiquement un par un
  - Vous montre un message pour vous dire combien de commentaires ont été fermés

### Comment l'utiliser ?

1. Allez sur une Pull Request dans Azure DevOps
2. Attendez quelques secondes que le bouton apparaisse en haut de la page
3. Cliquez sur le bouton "Close SonarCloud Comments"
4. Le script fait le travail et vous affiche un message de confirmation

**Note :** Le script ne ferme que les commentaires SonarQube qui sont encore "ouverts". Les commentaires déjà fermés ne sont pas touchés.

---

## ADO Build & Deploy - Viewer+

**Fichier:** `azure-devops/build-and-deploy-viewer-plus.user.js`

**📥 [Installer depuis GreasyFork][greasyfork-build-viewer]**

### À quoi ça sert ?

Ce script améliore la vue des builds dans Azure DevOps en permettant de replier/déplier les différentes étapes (stages) du build.

### Où ça fonctionne ?

Sur les pages de résultats de build dans Azure DevOps (l'URL contient `_build/results?*view=logs*`).

### Que fait-il concrètement ?

- **Replie automatiquement** toutes les étapes du build au chargement de la page
- **Ajoute une petite flèche** à côté de chaque étape pour pouvoir la replier ou la déplier
- Vous pouvez cliquer sur la flèche ou sur le titre de l'étape pour l'ouvrir/fermer

### Comment l'utiliser ?

Une fois installé, le script fonctionne automatiquement. Quand vous ouvrez une page de résultats de build :
- Toutes les étapes sont repliées par défaut (plus facile de voir l'ensemble)
- Cliquez sur une étape pour voir son détail
- Cliquez à nouveau pour la replier

C'est comme un accordéon : vous voyez d'abord juste les titres, et vous ouvrez ce qui vous intéresse !

---

## Installation

### Méthode simple : via GreasyFork (recommandé)

La méthode la plus simple est d'installer les scripts directement depuis [GreasyFork](https://greasyfork.org/fr/users/756002-victorros) :

1. **Installer Tampermonkey** (si ce n'est pas déjà fait)
   - Chrome/Edge : [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox : [Firefox Add-ons](https://addons.mozilla.org/fr/firefox/addon/tampermonkey/)
   - Safari : [Site officiel](https://www.tampermonkey.net/)

2. **Aller sur GreasyFork**
   - Visitez [votre page GreasyFork](https://greasyfork.org/fr/users/756002-victorros)
   - Cliquez sur le script que vous voulez installer
   - Cliquez sur le bouton vert "Installer ce script"
   - Confirmez l'installation

3. **C'est tout !**
   - Le script s'activera automatiquement sur les pages correspondantes
   - Vous verrez l'icône Tampermonkey changer de couleur quand un script est actif
   - Les mises à jour se feront automatiquement depuis GreasyFork

### Méthode alternative : installation manuelle

Si vous préférez installer les scripts manuellement depuis les fichiers sources :

1. **Installer Tampermonkey** (voir ci-dessus)

2. **Ajouter un script manuellement**
   - Cliquez sur l'icône Tampermonkey dans votre navigateur
   - Sélectionnez "Créer un nouveau script..."
   - Supprimez tout le contenu par défaut
   - Copiez-collez le contenu du fichier `.user.js` que vous voulez installer
   - Sauvegardez (Ctrl+S ou Cmd+S)

## Besoin d'aide ?

Si un script ne fonctionne pas comme prévu :
- Vérifiez que Tampermonkey est bien installé et activé
- Vérifiez que vous êtes sur la bonne page (l'URL doit correspondre à celle indiquée dans la description)
- Ouvrez la console du navigateur (F12) pour voir s'il y a des messages d'erreur

<!-- Links -->

[greasyfork-rhpi]: https://greasyfork.org/fr/scripts/458167-rhpi
[greasyfork-sonarcloud]: https://greasyfork.org/fr/scripts/567454-auto-close-sonarcloud-pr-comments
[greasyfork-build-viewer]: https://greasyfork.org/fr/scripts/458128-ado-build-deploy-viewer
