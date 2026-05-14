# Internship Project Documentation

## Overview

This project is a React + .NET 8 web application that connects to three Amazon Bedrock Agents from the `amazon-bedrock-agents-healthcare-lifesciences` repository.

The application has three main workflows:

1. **Study Registration / Protocol Generation**
   - Upload a clinical study synopsis PDF or enter free-text notes.
   - Backend extracts text from the PDF.
   - Backend asks the Clinical Trial Protocol Generator agent to create an ICH M11 protocol.
   - Backend converts the Markdown response to PDF and returns it to the frontend.

2. **Medical Analysis**
   - Paste clinical free text.
   - User chooses `SDOH`, `ICD-10`, or `Both`.
   - Backend sends the text directly to the JSL Medical agent.
   - The agent decides which internal tool to use based on its own Bedrock instructions.
   - Frontend renders Markdown and can download the result as PDF.

3. **Drug Pipeline Analysis**
   - Paste drug development pipeline text or ask a pipeline question.
   - Backend sends the text directly to the Drug Pipeline Data agent.
   - The agent uses its Bedrock Knowledge Base backed by pipeline data.
   - Frontend renders Markdown tables/lists/headings and can download the result as PDF.

## Local Application Architecture

### Frontend

- Location: `front`
- Framework: React
- Main screen: `front/src/components/HomeScreen/HomeScreen.jsx`
- Styling: `front/src/components/HomeScreen/HomeScreen.css`
- HTTP wrapper: `front/src/services/HttpService.js`

Frontend tabs:

| Tab | Backend endpoint | Output |
| --- | --- | --- |
| Study Registration | `POST /api/Study` | PDF protocol in iframe |
| Medical Analysis | `POST /api/Study/medical-analysis` | Markdown result rendered in UI |
| Drug Pipeline | `POST /api/Study/drug-pipeline` | Markdown result rendered in UI |
| Download PDF | `POST /api/Study/markdown-pdf` | PDF download |

### Backend

- Location: `back`
- Framework: ASP.NET Core / .NET 8
- Main controller: `back/controller/StudyController.cs`
- AWS integration: `back/AwsService.cs`
- Markdown to PDF conversion: `back/ProtocolPdfService.cs`

Important backend packages:

| Package | Purpose |
| --- | --- |
| `AWSSDK.BedrockAgentRuntime` | Calls Amazon Bedrock Agents |
| `PdfPig` | Extracts text from uploaded synopsis PDFs |
| `Markdig` | Converts Markdown to HTML |
| `PuppeteerSharp` | Renders HTML to PDF |

## Agent Configuration in the App

Agent IDs and aliases are currently configured in `back/AwsService.cs`.

```csharp
private readonly string _protocolAgentId = "...";
private readonly string _protocolAgentAlias = "...";

private readonly string _jslMedicalAgentId = "...";
private readonly string _jslMedicalAgentAlias = "...";

private readonly string _drugPipelineAgentId = "...";
private readonly string _drugPipelineAgentAlias = "...";
```

After deploying or redeploying any agent, update these values using the CloudFormation stack outputs:

- `AgentId`
- `AgentAliasId`

## Protocol 1: Clinical Trial Protocol Generator

### Purpose

The Clinical Trial Protocol Generator creates and optimizes clinical trial protocols. In this app, it is used to generate a full protocol from a synopsis PDF and optional notes.

The backend asks this agent to produce an **ICH M11 Clinical electronic Structured Harmonised Protocol (CeSHarP)** style protocol. The backend supplies the required M11 section list and tells the agent to preserve the full structure.

### Source in Amazon Bedrock Agents Repo

```text
agents_catalog/16-Clinical-trial-protocol-generator-agent/
```

Main files:

| File | Purpose |
| --- | --- |
| `clinical-trial-protocol-agent.yaml` | CloudFormation template |
| `clinical-trial-protocol-agent-packaged.yaml` | Packaged output after deployment packaging |
| `deploy.sh` | Deployment helper script |
| `README.md` | Original agent documentation |
| `action_groups/clinical_data_modal` | Lambda code used by the action group |

### AWS Resources Created

The CloudFormation template creates:

- Bedrock Agent named `clinical-trial-protocol-generator-agent`
- Bedrock Agent alias, usually `Latest`
- Lambda function named `clinical-data-model`
- Lambda permissions for Bedrock
- IAM role for Lambda
- Bedrock Guardrail named `ClinicalTrialProtocolGeneratorGuardrail`
- Action group named `clinical-data-model-action-group`

The agent action group exposes:

```text
getClinicalProtocolTemplate
```

### Deployment Prerequisites

- AWS CLI configured
- Amazon Bedrock model access enabled in the target region
- A Bedrock agent execution role available
- S3 bucket for packaging Lambda/action group artifacts

Check AWS identity:

```bash
aws sts get-caller-identity
```

Create an S3 bucket if needed:

```bash
aws s3 mb s3://YOUR_S3_BUCKET_NAME --region eu-central-1
```

### Deployment Command

From the agent folder:

```bash
cd path/to/amazon-bedrock-agents-healthcare-lifesciences/agents_catalog/16-Clinical-trial-protocol-generator-agent

export BUCKET_NAME="YOUR_S3_BUCKET_NAME"
export NAME="clinical-trial-protocol-agent"
export REGION="eu-central-1"
export BEDROCK_AGENT_SERVICE_ROLE_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_BEDROCK_AGENT_ROLE"

bash deploy.sh
```

If CloudFormation rejects an unknown `LayersBucketName` parameter, remove that parameter from `deploy.sh` or run the package/deploy commands manually with only `AgentIAMRoleArn`.

The helper script runs:

```bash
aws cloudformation package \
  --template-file clinical-trial-protocol-agent.yaml \
  --s3-bucket "$BUCKET_NAME" \
  --output-template-file clinical-trial-protocol-agent-packaged.yaml \
  --region "$REGION" \
  --force-upload

aws cloudformation deploy \
  --template-file clinical-trial-protocol-agent-packaged.yaml \
  --stack-name "$NAME" \
  --region "$REGION" \
  --parameter-overrides AgentIAMRoleArn="$BEDROCK_AGENT_SERVICE_ROLE_ARN" \
  --capabilities CAPABILITY_IAM
```

After deployment, read the stack outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name clinical-trial-protocol-agent \
  --region eu-central-1 \
  --query "Stacks[0].Outputs"
```

Copy:

- `AgentId` into `_protocolAgentId`
- `AgentAliasId` into `_protocolAgentAlias`

## Protocol 2: JSL Medical Analysis Agent

### Purpose

The JSL Medical agent analyzes unstructured medical text using John Snow Labs models deployed on SageMaker.

In this app, it powers the Medical Analysis tab:

- `SDOH`
- `ICD-10`
- `Both`

The frontend stores the selected option, but the backend currently sends only the raw clinical text to the Bedrock agent. The agent already has its own instructions and tools, so the application does not add extra prompt instructions.

### Source in Amazon Bedrock Agents Repo

```text
agents_catalog/12-JSL-analyze-medical-reports/
```

Main files:

| File | Purpose |
| --- | --- |
| `jsl-analyze-medical-reports.yaml` | Main CloudFormation template |
| `sagemaker-marketplace-endpoint.yaml` | Nested stack for SageMaker endpoints |
| `jsl-analyze-medical-reports-packaged.yaml` | Packaged output |
| `README.md` | Original deployment and usage instructions |
| `action-groups/analyze-medical-reports` | Lambda action group code |

### AWS Resources Created

The CloudFormation template creates:

- Bedrock Agent named `John-Snow-Labs-Analyze-Medical-Reports`
- Bedrock Agent alias, usually `Latest`
- Lambda action group for medical report analysis
- SageMaker endpoint for SDOH extraction
- SageMaker endpoint for ICD-10-CM sentence entity resolution
- IAM role/policy allowing Lambda to invoke SageMaker endpoints
- Bedrock Guardrail named `JSLAnalyzeMedicalReportsGuardrail`

The action group exposes:

```text
extract_social_determinants_of_health
extract_icd_10_cm_sentence_entities
```

### AWS Marketplace Prerequisites

Before deployment, subscribe to the John Snow Labs model products in AWS Marketplace:

- Extract Social Determinants of Health
- ICD-10-CM Sentence Entity Resolver

The template parameters include these product ARNs:

```text
ExtractSocialDeterminantsofHealthModelProductArn
ICD10CMSentenceEntityResolverModelProductArn
```

### Deployment Command

From the agent folder:

```bash
cd path/to/amazon-bedrock-agents-healthcare-lifesciences/agents_catalog/12-JSL-analyze-medical-reports

export BUCKET_NAME="YOUR_S3_BUCKET_NAME"
export NAME="jsl-analyze-medical-reports"
export REGION="eu-central-1"
export BEDROCK_AGENT_SERVICE_ROLE_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_BEDROCK_AGENT_ROLE"

aws cloudformation package \
  --template-file "jsl-analyze-medical-reports.yaml" \
  --s3-bucket "$BUCKET_NAME" \
  --output-template-file "jsl-analyze-medical-reports-packaged.yaml" \
  --region "$REGION"

aws cloudformation deploy \
  --template-file "jsl-analyze-medical-reports-packaged.yaml" \
  --capabilities CAPABILITY_IAM \
  --stack-name "$NAME" \
  --region "$REGION" \
  --parameter-overrides \
    AgentAliasName="Latest" \
    AgentIAMRoleArn="$BEDROCK_AGENT_SERVICE_ROLE_ARN"
```

After deployment, get outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name jsl-analyze-medical-reports \
  --region eu-central-1 \
  --query "Stacks[0].Outputs"
```

Copy:

- `AgentId` into `_jslMedicalAgentId`
- `AgentAliasId` into `_jslMedicalAgentAlias`

## Protocol 3: Drug Development Pipeline Data Agent

### Purpose

The Drug Pipeline agent answers natural language questions about pharmaceutical drug development pipelines. It uses a Bedrock Knowledge Base backed by enriched pipeline data in S3 and OpenSearch Serverless.

In this app, it powers the Drug Pipeline tab. The backend sends the user text directly to the agent because the agent already has its own instructions and knowledge base configuration.

### Source in Amazon Bedrock Agents Repo

```text
agents_catalog/23-data-harmonisation-drug-dev-pipeline/
```

Main files:

| File | Purpose |
| --- | --- |
| `pipeline-data-agent-cfn.yaml` | CloudFormation template |
| `README.MD` | Original deployment and solution documentation |
| `prompt.md` | Data preparation prompt for creating enriched pipeline data |
| `pipeline_data/PROJECT_SUMMARY.md` | Data preparation notes |

### Data Preparation

The original solution collects and harmonizes drug pipeline data from:

- Pfizer
- Novo Nordisk
- Novartis

The expected final dataset is:

```text
enriched_pipeline_data.json
```

The README describes the process:

1. Collect company pipeline pages.
2. Extract data into JSON per company.
3. Create a common data model.
4. Enrich with ontologies and controlled vocabularies.
5. Upload final enriched JSON to S3.

The template expects:

| Parameter | Meaning |
| --- | --- |
| `S3Bucket` | Bucket containing the enriched pipeline JSON |
| `S3Key` | Object key, usually `enriched_pipeline_data.json` |
| `AgentRole` | Bedrock agent execution role ARN |
| `BedrockModelId` | Foundation model used by the agent |
| `IndexName` | OpenSearch vector index name |
| `AgentAliasName` | Agent alias, usually `Latest` |

### AWS Resources Created

The CloudFormation template creates:

- OpenSearch Serverless vector collection
- OpenSearch policies and index creation Lambda
- Bedrock Knowledge Base
- S3 data source for the Knowledge Base
- Bedrock Agent named `pipeline-data-agent`
- Bedrock Agent alias
- IAM roles and policies

The template outputs:

- `CollectionId`
- `CollectionArn`
- `KnowledgeBaseId`
- `AgentId`
- `AgentArn`
- `AgentAliasId`

### Deployment Command

Upload the enriched data file first:

```bash
aws s3 cp enriched_pipeline_data.json s3://YOUR_S3_BUCKET_NAME/enriched_pipeline_data.json --region eu-central-1
```

Deploy the stack:

```bash
cd path/to/amazon-bedrock-agents-healthcare-lifesciences/agents_catalog/23-data-harmonisation-drug-dev-pipeline

aws cloudformation deploy \
  --template-file pipeline-data-agent-cfn.yaml \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --stack-name pipeline-data-agent \
  --region eu-central-1 \
  --parameter-overrides \
    S3Bucket=YOUR_S3_BUCKET_NAME \
    AgentRole=arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_BEDROCK_AGENT_ROLE \
    S3Key=enriched_pipeline_data.json \
    BedrockModelId=us.anthropic.claude-3-5-sonnet-20241022-v2:0 \
    AgentAliasName=Latest \
    IndexName=pipeline-data-index
```

After deployment:

```bash
aws cloudformation describe-stacks \
  --stack-name pipeline-data-agent \
  --region eu-central-1 \
  --query "Stacks[0].Outputs"
```

Copy:

- `AgentId` into `_drugPipelineAgentId`
- `AgentAliasId` into `_drugPipelineAgentAlias`

Then sync the Knowledge Base data source:

1. Open Amazon Bedrock console.
2. Go to **Knowledge Bases**.
3. Find the knowledge base whose name includes `PipelineData`.
4. Open the S3 data source.
5. Click **Sync**.

## Running the Local App

### Backend

```bash
cd path/to/back
dotnet restore
dotnet run
```

Default backend URL used by the frontend:

```text
http://localhost:5294/
```

### Frontend

```bash
cd path/to/front
npm install
npm start
```

## Backend Endpoint Details

### Generate ICH M11 Protocol

```http
POST /api/Study
Content-Type: multipart/form-data
```

Form fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `synopsis` | PDF file | No, if `notes` exists | Study synopsis PDF |
| `notes` | string | No, if `synopsis` exists | Free-text notes or pasted synopsis text |

Response:

```text
application/pdf
```

### Medical Analysis

```http
POST /api/Study/medical-analysis
Content-Type: application/json
```

Body:

```json
{
  "text": "clinical text",
  "analysisType": "sdoh | icd10 | both",
  "procedureType": "General Assessment"
}
```

Response:

```text
Markdown/plain text
```

### Drug Pipeline Analysis

```http
POST /api/Study/drug-pipeline
Content-Type: application/json
```

Body:

```json
{
  "text": "pipeline question or drug development text"
}
```

Response:

```text
Markdown/plain text
```

### Markdown Result to PDF

```http
POST /api/Study/markdown-pdf
Content-Type: application/json
```

Body:

```json
{
  "text": "markdown result",
  "fileName": "analysis.pdf"
}
```

Response:

```text
application/pdf
```

## Response Rendering and PDF Generation

Agent responses are usually Markdown. The frontend renders:

- headings
- bold text
- bullet lists
- Markdown tables

The backend can also convert Markdown to PDF:

1. `Markdig` converts Markdown to HTML.
2. `ProtocolPdfService` wraps the HTML with CSS.
3. `PuppeteerSharp` renders the HTML to an A4 PDF.
4. Backend returns the PDF as a file.

## Troubleshooting

### Guardrail message: `Sorry, your query violates our usage policies.`

This comes from Bedrock Guardrails. It can happen if:

- the input resembles prompt injection,
- the input is judged as policy-violating,
- the app wraps the prompt with extra instructions that trigger the guardrail.

Current behavior:

- Medical Analysis sends only raw clinical text to the JSL agent.
- Drug Pipeline sends only raw pipeline text to the pipeline agent.
- Protocol Generation still includes explicit ICH M11 instructions because that is required by the app workflow.

### `BedrockAgentRuntimeEventStreamException`

If the backend logs show an error while reading `response.Completion`, the Bedrock agent or one of its Lambda/action group dependencies failed after the invocation started.

Check:

- Lambda CloudWatch logs for the failing action group.
- SageMaker endpoint status for JSL Medical.
- Knowledge Base sync status for Drug Pipeline.
- Agent alias points to the latest prepared agent version.

### Drug Pipeline Agent Says It Cannot Find Data

Check:

1. `enriched_pipeline_data.json` is uploaded to the configured S3 bucket/key.
2. The Bedrock Knowledge Base data source has been synced.
3. OpenSearch Serverless collection and index were created.
4. The app uses the deployed `AgentId` and `AgentAliasId`.

### PDF Download Fails

Check:

- Backend is running.
- PuppeteerSharp can download/use Chromium.
- Network access is available on first Chromium download.
- The endpoint `POST /api/Study/markdown-pdf` returns `application/pdf`.

## Quick Verification Checklist

After deployment and local configuration:

1. Update all three agent IDs and aliases in `AwsService.cs`.
2. Run backend with `dotnet run`.
3. Run frontend with `npm start`.
4. Generate a protocol from a synopsis PDF or notes.
5. Run Medical Analysis with test clinical text.
6. Run Drug Pipeline with a question such as:

```text
What diabetes drug candidates are in Phase 1 development?
```

7. Use **Download PDF** on Medical Analysis and Drug Pipeline results.
