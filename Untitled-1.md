Viewed Bases-OpenShift.txt:1-800
Viewed Bases-OpenShift1.txt:1-340

## Analyse rapide des deux fichiers

| Fichier | Contenu principal | Objectif du TP |
|--------|-------------------|----------------|
| **Bases‑OpenShift.txt** | Description détaillée du TP‑2 à TP‑7 : création d’un compte, projets, déploiements S2I, webhooks, services/routes, persistance, scaling et catalogue de templates. | Fournir un **cookbook** complet pour monter un environnement de laboratoire fonctionnel sur le cluster OKD/Openshift hébergé chez Hetzner. |
| **Bases‑OpenShift1.txt** | Synthèse architecturale : vue d’ensemble, phases, bonnes pratiques DevSecOps (moindre privilège, TLS, secrets, RWX, HPA, anti‑affinité). | Proposer **une méthodologie** structurée et sécurisée pour réaliser les TP dans le bon ordre, en expliquant les concepts sous‑jacents. |

Les deux documents forment déjà une **road‑map** très complète ; il ne manque que :

1. **Un plan d’apprentissage** pas à pas pour un novice (définitions, pourquoi chaque étape, quels concepts Kubernetes/Openshift sont mobilisés).  
2. **Un tableau de vérifications** (check‑list) qui permette de s’assurer que chaque TP a bien été réalisé et que les exigences DevSecOps sont respectées.  
3. **Des repères de sécurité** (ex. : rotation des secrets, TLS, stockage RWX, HPA).  

---

## Plan de résolution structuré (pour un novice)

### 1️⃣ Phase préparatoire – Vérifier le cluster

| Action | Commande | Pourquoi ? | Concepts clés |
|--------|----------|------------|----------------|
| Se connecter en tant que `kubeadmin` | `oc login https://api.caas.eazytraining.lab:6443 -u kubeadmin` | S’assurer que le cluster est accessible et que tous les nœuds sont *Ready*. | **Cluster health**, **MachineConfigPool** |
| Vérifier les nœuds & MCP | `oc get nodes` <br> `oc get mcp` | Confirmer que le pool `master` et `worker` sont à jour (`UPDATED=True`). | **MCP**, **MachineConfig** |
| Lister les StorageClass & PV disponibles | `oc get storageclass` <br> `oc get pv` | S’assurer que le storage NFS (`managed-nfs-storage`) est présent – il sera utilisé au TP‑5. | **StorageClass**, **PersistentVolume** |
| Vérifier la registry interne | `oc get pods -n openshift-image-registry` | La registry interne sera utilisée pour les images S2I. | **Image Registry** |

> **Astuce novice** : chaque commande renvoie un tableau ; si la colonne *STATUS* indique `Ready` ou `True`, tout est OK.

---

### 2️⃣ TP‑2 – Identité & accès (IAM)

| Étape | Commande | Explication (k8s / OpenShift) | Bonnes pratiques DevSecOps |
|------|----------|-------------------------------|----------------------------|
| Créer l’utilisateur `adalbert` (HTPASSWD) | `htpasswd -B /root/okd-upi-install/manifests/users.htpasswd adalbert` | OpenShift peut s’appuyer sur un **OAuth htpasswd** pour l’authentification. | Utiliser un **hash bcrypt** (`-B`) ; ne jamais stocker le mot de passe en clair. |
| Mettre à jour le secret OAuth | `oc create secret generic htpasswd-secret --from-file=htpasswd=/root/okd-upi-install/manifests/users.htpasswd -n openshift-config --dry-run=client -o yaml | oc apply -f -` | Le secret est consommé par le **OAuth server**. | Le secret reste dans le namespace `openshift-config` (privé). |
| Créer le projet `adalnanda` | `oc new-project adalnanda --description="Projet lab adalnanda" --display-name="adalnanda Lab"` | Un **Project** (Namespace) isole les ressources. | Aucun droit admin n’est donné par défaut. |
| Accorder le rôle `edit` à l’utilisateur | `oc adm policy add-role-to-user edit adalbert -n adalnanda` | Le rôle `edit` permet de créer/mettre à jour les workloads sans toucher au control‑plane. | **Principe du moindre privilège** : pas de `cluster-admin`. |
| Vérifier via API | `TOKEN=$(oc whoami -t)` <br> `curl -sk -H "Authorization: Bearer $TOKEN" https://api.caas.eazytraining.lab:6443/apis/project.openshift.io/v1/projects | python3 -m json.tool` | Montre comment interroger l’API REST d’OpenShift. | Apprendre à **authentifier via token** (pas de mot de passe). |

> **Résultat attendu** : `oc get users` doit lister `adalbert`; `oc get rolebindings -n adalnanda` doit montrer le binding `edit`.

---

### 3️⃣ TP‑3 – CI/CD basique (S2I + Webhook)

| Étape | Commande | Concept | Sécurité |
|------|----------|---------|----------|
| Déployer **Django** (S2I Python) | `oc new-app python~https://github.com/sclorg/django-ex.git --name=django -n adalnanda` | **Source‑to‑Image** (S2I) compile le code dans une image prête à l’emploi. | L’image provient d’un repo **officiel** (sclorg). |
| Suivre le build | `oc logs -f bc/django -n adalnanda` | **BuildConfig** crée le Build et le **BuildPod**. | Vérifier qu’aucune erreur n’apparaît. |
| Exposer la route | `oc expose svc/django -n adalnanda` | Crée une **Route** (URL publique) qui pointe vers le Service. | **TLS edge** recommandé : `oc create route edge …`. |
| Déployer **simple‑webapp** (fork) | `oc new-app python~https://github.com/adalbert/simple-webapp.git --name=simple-webapp -n adalnanda` | Même principe S2I, mais sur votre fork. | Vous êtes propriétaire du code – vous pouvez le modifier. |
| Créer le webhook GitHub | `SECRET=$(oc get bc/simple-webapp -n adalnanda -o jsonpath='{.spec.triggers[?(@.type=="GitHub")].github.secret}')` <br> `echo "https://api.caas.eazytraining.lab:6443/apis/build.openshift.io/v1/namespaces/adalnanda/buildconfigs/simple-webapp/webhooks/${SECRET}/github"` | Le **trigger** GitHub invoque automatiquement un build à chaque *push*. | Le secret **ne doit jamais être versionné** ; il reste dans le BuildConfig. |
| Configurer le webhook sur GitHub | *Settings → Webhooks → Add webhook* → coller l’URL ci‑dessus, `Content type = application/json`, `Just the push event`. | Liaison entre GitHub et OpenShift. | **HTTPS obligatoire** (port 6443). |

> **Vérification** : après un `git push`, `oc get builds -n adalnanda` doit afficher un nouveau build en cours.

---

### 4️⃣ TP‑4 – Réseau interne (Service + Route)

| Étape | Commande | Pourquoi | Sécurité |
|------|----------|----------|----------|
| Exporter la BuildConfig S2I → Docker | `oc get bc/simple-webapp -n adalnanda -o yaml > /tmp/bc-docker.yaml` <br> *Modifier `type: Source` → `type: Docker` et l’URL du repo* | Passage à un **Docker Build** (plus de contrôle sur l’image). | Vérifier que le Dockerfile ne contient pas de secrets. |
| Créer l’ImageStream | `oc create imagestream simple-webapp-docker -n adalnanda` | L’ImageStream agit comme un **registry interne** pour l’image construite. | Aucun accès externe. |
| Démarrer le build Docker | `oc start-build bc/simple-webapp-docker -n adalnanda --follow` | Compile l’image Docker à partir du repo. | Le build s’exécute dans un **pod isolé**. |
| Service ClusterIP (pas NodePort) | `cat <<EOF | oc apply -f -`<br>`apiVersion: v1`<br>`kind: Service`<br>`metadata:`<br>`  name: simple-webapp-docker`<br>`spec:`<br>`  type: ClusterIP`<br>`  selector:`<br>`    app: simple-webapp-docker`<br>`  ports:`<br>`  - port: 8080`<br>`    targetPort: 8080`<br>`EOF` | Le Service expose le pod **uniquement à l’intérieur du cluster**. | Limite la surface d’attaque. |
| Route TLS edge | `oc create route edge simple-webapp-docker --service=simple-webapp-docker --insecure-policy=Redirect -n adalnanda` | Force le trafic HTTP → HTTPS. | **TLS** protège les échanges client‑serveur. |
| Vérifier l’accès | `curl -sk https://$(oc get route simple-webapp-docker -n adalnanda -o jsonpath='{.spec.host}')` | Test rapide de la disponibilité. | `-k` (skip cert verification) n’est utilisé qu’en lab ; en prod, utilisez un certificat valide. |

---

### 5️⃣ TP‑5 – Persistance (PVC / NFS)

| Étape | Commande | Concept | Sécurité |
|------|----------|---------|----------|
| Créer le PVC RWX | `cat <<EOF | oc apply -f -`<br>`apiVersion: v1`<br>`kind: PersistentVolumeClaim`<br>`metadata:`<br>`  name: data-storage`<br>`spec:`<br>`  accessModes:`<br>`  - ReadWriteMany`<br>`  storageClassName: managed-nfs-storage`<br>`  resources:`<br>`    requests:`<br>`      storage: 1Gi`<br>`EOF` | **ReadWriteMany** permet à plusieurs pods (replicas) de partager le même volume. | Le stockage NFS doit être **isolé** du réseau public. |
| Attacher le PVC au deployment | `oc set volume deployment/simple-webapp-docker --add --name=data-storage --type=persistentVolumeClaim --claim-name=data-storage --mount-path=/data -n adalnanda` | Ajoute le volume au pod. | Aucun secret n’est stocké dans le volume. |
| Vérifier le montage | `POD=$(oc get pod -l app=simple-webapp-docker -n adalnanda -o jsonpath='{.items[0].metadata.name}')` <br> `oc exec $POD -n adalnanda -- df -h | grep /data` | Confirme que le volume est bien monté. | Test de persistance : `echo "test $(date)" > /data/test.txt`. |
| Test de persistance après redémarrage | `oc delete pod $POD -n adalnanda` <br> *Attendre le nouveau pod* <br> `oc exec $NEW_POD -n adalnanda -- cat /data/test.txt` | Le fichier doit survivre. | Garantit que le PVC fonctionne correctement. |

> **Note DevSecOps** : ne stockez jamais de **secrets** (mot de passe, clés) dans un PVC partagé ; utilisez les **Secrets OpenShift**.

---

### 6️⃣ TP‑6 – Scaling & résilience

| Étape | Commande | Pourquoi | Sécurité |
|------|----------|----------|----------|
| Scale à 3 réplicas | `oc scale deployment/simple-webapp-docker --replicas=3 -n adalnanda` | Crée de la **haute disponibilité**. | Chaque pod tourne sur un node différent (anti‑affinité implicite). |
| Vérifier la répartition | `oc get pods -l app=simple-webapp-docker -n adalnanda -o wide` | S’assurer que les pods sont répartis sur plusieurs workers. | Évite un **single point of failure**. |
| Ajouter un HPA (autoscaling) | `oc autoscale deployment/simple-webapp-docker --min=2 --max=5 --cpu-percent=70 -n adalnanda` | Le **Horizontal Pod Autoscaler** ajuste le nombre de pods en fonction de la charge. | Le HPA doit être limité (`max`) pour éviter un **burst** incontrôlé. |
| Tester le load‑balancing | `URL=$(oc get route simple-webapp-docker -n adalnanda -o jsonpath='{.spec.host}')` <br> `for i in {1..9}; do curl -sk https://$URL -o /dev/null -w "%{http_code}\n"; done` | Chaque requête doit être servie par un pod différent (round‑robin). | Vérifier que le trafic passe uniquement via le **Service** et la **Route** sécurisée. |

---

### 7️⃣ TP‑7 – Catalogue & templates (self‑service)

| Étape | Commande | Concept | Sécurité |
|------|----------|---------|----------|
| Télécharger le template Redis (éphémère) | `curl -o /tmp/redis-ephemeral.json https://raw.githubusercontent.com/openshift/origin/master/examples/db-templates/redis-ephemeral-template.json` | Un **Template** décrit un ensemble de ressources (Service, Deployment, Secret, …). | Le template crée un **Secret** contenant le mot de passe. |
| Inspecter le template | `python3 -m json.tool /tmp/redis-ephemeral.json | head -80` | Comprendre les paramètres (`REDIS_PASSWORD`, `MEMORY_LIMIT`). | Aucun secret en clair n’est exposé ; il sera encodé en base64. |
| Importer le template dans le namespace `openshift` (admin) | `oc login -u kubeadmin` <br> `oc create -f /tmp/redis-ephemeral.json -n openshift` | Le catalogue devient disponible pour tous les utilisateurs. | Seul un **admin** peut créer/modifier le catalogue. |
| Déployer Redis depuis le template (utilisateur) | `oc login -u adalbert -p <pwd>` <br> `oc new-app redis-ephemeral -n adalnanda -p REDIS_PASSWORD=Redis@2024! -p MEMORY_LIMIT=256Mi` | `oc new-app` (ou `oc process … | oc apply -f -`) instancie le template. | Le mot de passe est stocké dans un **Secret** (`redis`), non visible en clair. |
| Vérifier le secret | `oc get secret redis -n adalnanda -o jsonpath='{.data.database-password}' | base64 -d` | Confirme que le secret a bien été créé. | Les secrets restent dans le namespace et sont **chiffrés au repos** (et en transit via TLS). |

---

## Checklist de validation finale (à exécuter après chaque TP)

```bash
# ==== TP‑2 – Identité ====
oc get users | grep adalbert
oc get rolebindings -n adalnanda | grep adalbert

# ==== TP‑3 – CI/CD ====
oc get bc -n adalnanda
oc get builds -n adalnanda | grep -v Failed
# Test webhook : push un commit → un nouveau build doit apparaître

# ==== TP‑4 – Réseau ====
oc get svc -n adalnanda
oc get route -n adalnanda
curl -sk https://$(oc get route django -n adalnanda -o jsonpath='{.spec.host}')
curl -sk https://$(oc get route simple-webapp-docker -n adalnanda -o jsonpath='{.spec.host}')

# ==== TP‑5 – Persistance ====
oc get pvc data-storage -n adalnanda
# Vérifier le fichier test persiste après delete pod
oc delete pod $(oc get pod -l app=simple-webapp-docker -n adalnanda -o jsonpath='{.items[0].metadata.name}')
# Puis vérifier le contenu du fichier

# ==== TP‑6 – Scaling ====
oc get deployment simple-webapp-docker -n adalnanda -o jsonpath='{.spec.replicas}'
oc get hpa -n adalnanda
# Faire plusieurs requêtes sur la route et observer le changement de pod

# ==== TP‑7 – Catalogue ====
oc get templates -n openshift | grep redis
oc get bc -n adalnanda | grep redis
oc get secret redis -n adalnanda
```

---

## Points de vigilance DevSecOps (rappel)

| Risque | Mitigation |
|--------|------------|
| **Utilisation du compte `kubeadmin`** | Limiter son usage : ne l’employer que pour les opérations d’infrastructure (catalogue, stockage). |
| **Secrets exposés dans les URLs de webhook** | Ne jamais versionner l’URL ; la rotation du secret se fait via `oc set triggers`. |
| **Routes HTTP non chiffrées** | Toujours créer les routes avec `edge` TLS + `--insecure-policy=Redirect`. |
| **Données sensibles dans les PVC** | Stocker les credentials dans **Secrets**, pas dans les volumes partagés. |
| **SPOF (single replica)** | Configurer **HPA** (min ≥ 2) et anti‑affinité si possible. |
| **Templates non contrôlés** | Restreindre l’accès au namespace `openshift` (seuls les admins peuvent ajouter/modifier). |
| **Images non‑signées** | Utiliser les images officielles ou signer vos propres images (OpenShift ImageSignature). |

---

## Comment procéder avec le formateur (vous)

1. **Lire** la partie *Vue d’ensemble* (lignes 11‑19 du fichier 1) pour comprendre le fil conducteur.  
2. **Exécuter** les commandes de la **Phase 1** (vérifications du cluster) ; si tout est *Ready*, passez à la Phase 2.  
3. **Suivre** les scripts fournis dans chaque TP ; copiez‑collez les blocs de code dans votre terminal (ou dans un fichier `.sh` que vous exécutez).  
4. **Valider** chaque TP avec la checklist ci‑dessus ; si un test échoue, revérifiez les logs (`oc logs …`) et corrigez.  
5. **Documenter** vos observations (ex. : “Le webhook a déclenché le build X”, “Le PVC a survécu au redémarrage du pod”).  
6. **Passer** au TP suivant **seulement** après que la checklist soit verte.  

---

### Ressources complémentaires (pour approfondir)

| Sujet | Lien (public) |
|-------|----------------|
| OpenShift **OAuth & htpasswd** | <https://docs.openshift.com/container-platform/4.10/authentication/identity_providers/configuring-htpasswd-identity-provider.html> |
| S2I (Source‑to‑Image) | <https://docs.openshift.com/container-platform/4.10/openshift_images/create-images.html> |
| Webhook GitHub | <https://docs.openshift.com/container-platform/4.10/builds/triggering-builds-build-hooks.html#builds-triggering-builds-webhook> |
| Persistent Volumes (RWX) | <https://docs.openshift.com/container-platform/4.10/storage/understanding-persistent-storage.html> |
| Horizontal Pod Autoscaler | <https://docs.openshift.com/container-platform/4.10/nodes/pods/nodes-pods-autoscaling.html> |
| Templates & Service Catalog | <https://docs.openshift.com/container-platform/4.10/applications/templates.html> |

---

## En résumé

- **Suivez l’ordre** : TP‑2 → TP‑3 → … → TP‑7.  
- **Comprenez chaque concept** (User, Project, BuildConfig, Service, Route, PVC, HPA, Template).  
- **Appliquez les bonnes pratiques DevSecOps** : moindre privilège, TLS, secrets, stockage RWX, autoscaling.  
- **Utilisez la checklist** pour valider chaque étape avant de passer à la suivante.  

Vous avez maintenant un **plan d’apprentissage complet** qui vous guidera pas à pas, tout en vous inculquant les principes de sécurité indispensables à tout praticien DevSecOps sur OpenShift. Bon travail ! 🚀