CI/CD for vk-ads-mlops

What I added

- `.github/workflows/ci.yml` — runs Python tests and builds the UI on PRs/pushes.
- `.github/workflows/build_and_integration.yml` — builds Docker images and runs integration smoke tests.
- `.github/workflows/cd.yml` — builds images, can push to an external registry and deploy via SSH; also includes a job to publish to GitHub Container Registry (GHCR).
- `.github/workflows/mlflow_smoke.yml` — spins up MLflow and logs a simple run for smoke testing.

Required secrets (set in GitHub repository Settings → Secrets):

- REGISTRY_HOST, REGISTRY_USERNAME, REGISTRY_PASSWORD — for external registry pushes.
- SSH_PRIVATE_KEY, DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH — for SSH deploy step.
- If using GHCR the workflow uses `GITHUB_TOKEN` automatically (no extra secret required), but ensure `packages: write` permission is available.

Local smoke testing

1. Start MLflow locally (same as the repository's docker-compose):

```bash
docker compose up -d mlflow
```

2. Run a small MLflow logging script:

```bash
python -m pip install --upgrade pip
python -m pip install mlflow
python - <<'PY'
import mlflow
mlflow.set_tracking_uri('http://127.0.0.1:5000')
exp = mlflow.get_experiment_by_name('local-smoke')
if exp is None:
    exp_id = mlflow.create_experiment('local-smoke')
else:
    exp_id = exp.experiment_id
with mlflow.start_run(experiment_id=exp_id):
    mlflow.log_param('smoke', True)
    mlflow.log_metric('accuracy', 0.5)
print('OK')
PY
```

3. Tear down:

```bash
docker compose down
```

How to use GHCR (GitHub Packages)

- The `build-and-push-ghcr` job in `cd.yml` builds and pushes two images to `ghcr.io/${{ github.repository_owner }}/...`.
- No extra secret required; workflows use `${{ secrets.GITHUB_TOKEN }}`. Make sure the repository has `packages` write permission for the workflow.

Release assets

- The `release_on_tag.yml` workflow now packages the repository `artifacts/` directory (if present) into a zip and uploads it to the created GitHub Release as `artifacts_<tag>.zip`.
- If `artifacts/` is absent the workflow uploads a small placeholder file instead.

Notes and next steps

- Add the required secrets in repository settings before enabling `cd.yml` deploy steps.
- If you want automated releases using GitHub Releases or tagging strategy, I can add a release workflow.
- If you prefer pushing images only on tags, I can update `cd.yml` to trigger on `push` to `tags/*`.

If you'd like, I can now:
- add a `RELEASE` workflow that triggers on tags and creates a GitHub Release, or
- change `cd.yml` to only push images on `tags/*` and PRs to `main`.
