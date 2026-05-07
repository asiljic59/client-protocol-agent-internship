# Documentation of an internship project

## Client Trial Generator Protocol

### Setup
- Pokrenite backend u folderu Intern/backend komandom `dotnet run`
- Pokrenite frontend u folderu Intern/frontend komandom `npm start`

### 1. Workflow of agent on AWS

- Asking the agent a question, for example: "Create a Phase 2 protocol template for a randomized controlled trial testing a new GLP-1 agonist in type 2 diabetes"
- Guardrails acts as a shield and checks prompt for misconduct or prompt injection.
- Main model (for example Claude 4.5) reads requests and its "instructions"
- Agent calls the clinical-data-model-action-group and then Lambda `clinical-data-model` fires, reads cmd.json, and sends the template back.
- Claude takes template and fills it with instructions and informations.

### 2. Architecture of MVP project
- .NET 8 Web API backend
- React frontend
- AWS

### 3. Conceptual workflow of application
- User fills form on website in next format : study title, theraupetic area, disease,phase, sample size, arms, comparator, countries, notes.
- On submit, form is being sent to backend
- Backend then takes that request, and call
`AmazonBedrockAgentRuntimeClient`
with and ID and alias of Agent on Amazon Bedrock
- Data is being send as text input, in this format
`string formattedInput = $@"
        Generate a Clinical Trial Protocol draft based on the following details:
        - Study Title: {study.StudyTitle}
        - Therapeutic Area: {study.TherapeuticArea}
        - Disease: {study.Disease}
        - Phase: {study.Phase}
        - Sample Size: {study.SampleSize}
        - Number of Arms: {study.Arms}
        - Comparator: {study.Comparator}
        - Countries: {study.Countries}
        - Additional Notes: {study.Notes}";` 
- After sending to agent, and agent processing the request, we get Markdown formated string as response.
- Then, backend converts Markdown file to HTML file and finally to PDF format which is being sent to frontend.
- Frontent displays given PDF file of research in `<iframe>` tag.
