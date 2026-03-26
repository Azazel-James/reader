# Reader

### Utilisation

1. Sélectionner l'archive fiscale au format zip à partir de l'input (étape 1).
2. S'il contient un fichier sqlite, il est alors possible de choisir une table à afficher à partir du selecteur (étape 2).

3. Cliquer sur le bouton "Exporter" pour télécharger la table affichée en format csv.  
   Dans le selecteur, les options précédées d'une étoile (⭐) renvoie à un export multitable qui permet de voir des factures complètes avec les articles et réglèments qui leur sont associés.

4. Cliquer sur le bouton "Vérifier" pour lancer la vérification des enregistrements de la table sélectionnée.  
   La fonction vérifie que les enregistrements n'ont pas été modifiés depuis leur signature et que les signatures sont présentent dans le SAS.

### Affichage des résultats

Le compte des signatures trouvées et des signatures manquantes du SAS est affiché au dessus de la table de données.
La colonne vérification de la table de données est mise à jour :

- Un cadenas (🔒) est affiché si la vérification cryptographique est valide.
- Une encoche (✅) est affiché si la signature est retrouvée dans le SAS.
- Une croix (❌) est affiché en cas de non-validité des résultats.
