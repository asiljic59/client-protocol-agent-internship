using Amazon;
using Amazon.BedrockAgentRuntime;
using Amazon.BedrockAgentRuntime.Model;
using System.Text;

public class AwsService
{
    private readonly AmazonBedrockAgentRuntimeClient _client =
        new AmazonBedrockAgentRuntimeClient(RegionEndpoint.EUCentral1);

    // ── Agent IDs ────────────────────────────────────────────────────────────
    // Protocol / Study agent (existing)
    private readonly string _protocolAgentId    = "IGYYQY3KMD";
    private readonly string _protocolAgentAlias = "RTNNYSQQV8";

    // JSLMedical agent — handles SDOH extraction, ICD-10 coding, or both
    private readonly string _jslMedicalAgentId    = "4U5AAAJGJO";
    private readonly string _jslMedicalAgentAlias = "SKDQHG0XCC";

    // Drug pipeline agent — replace with outputs from pipeline-data-agent-cfn.yaml deployment
    private readonly string _drugPipelineAgentId    = "GNEHHZAJQL";
    private readonly string _drugPipelineAgentAlias = "AEVBEQQNWA";

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<InvokeAgentResponse?> InvokeAgent(
        string agentId, string agentAlias, string inputText)
    {
        var request = new InvokeAgentRequest
        {
            AgentId      = agentId,
            AgentAliasId = agentAlias,
            SessionId    = Guid.NewGuid().ToString(),
            InputText    = inputText,
        };

        try
        {
            return await _client.InvokeAgentAsync(request);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Agent invocation error: {ex.Message}");
            return null;
        }
    }

    public async Task<string> GetResponseText(InvokeAgentResponse response)
    {
        var sb = new StringBuilder();

        try
        {
            await foreach (var ev in response.Completion)
            {
                if (ev is PayloadPart chunk)
                {
                    using var reader = new StreamReader(chunk.Bytes);
                    var text = await reader.ReadToEndAsync();
                    if (!string.IsNullOrWhiteSpace(text))
                        sb.Append(text);
                }
            }
        }
        catch (BedrockAgentRuntimeEventStreamException ex)
        {
            Console.WriteLine($"Agent response stream error: {ex.Message}");
            return "The agent could not complete the request because one of its backend actions failed. Check the Bedrock agent Lambda logs for details.";
        }
        catch (DependencyFailedException ex)
        {
            Console.WriteLine($"Agent dependency error: {ex.Message}");
            return "The agent could not complete the request because a dependent service failed. Check the Bedrock agent action/Lambda logs for details.";
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Agent response read error: {ex.Message}");
            return "The agent response could not be read. Check the backend logs for details.";
        }

        return sb.ToString();
    }

    // ── Protocol generation (existing) ──────────────────────────────────────

    public async Task<InvokeAgentResponse?> GenerateProtocol(string synopsisText, string? notes)
    {
        var sections = new StringBuilder();
        sections.AppendLine("Generate a Clinical Trial Protocol draft based on the following synopsis and notes.");
        sections.AppendLine("Make this study EXCLUSIVELY BY M11 PROTOCOL (ICH M11).");
        sections.AppendLine();
        sections.AppendLine("Follow the ICH M11 Clinical electronic Structured Harmonised Protocol (CeSHarP) template exactly. Produce every numbered section listed below as a Markdown heading (use `##` for top-level sections and `###` for sub-sections), in the order given. Do not skip any section: if the synopsis/notes do not contain the required information, write `[To be determined]` for that subsection rather than omitting it. Use Markdown tables for the Schedule of Activities and the Objectives/Endpoints table.");
        sections.AppendLine();
        sections.AppendLine("Required M11 sections:");
        sections.AppendLine("1. Protocol Summary");
        sections.AppendLine("   1.1 Synopsis");
        sections.AppendLine("   1.2 Schema (study design diagram, described in text)");
        sections.AppendLine("   1.3 Schedule of Activities (Markdown table)");
        sections.AppendLine("2. Introduction");
        sections.AppendLine("   2.1 Study Rationale");
        sections.AppendLine("   2.2 Background");
        sections.AppendLine("   2.3 Benefit/Risk Assessment");
        sections.AppendLine("3. Objectives and Endpoints (Markdown table with columns: Objective | Endpoint | Estimand / Analysis)");
        sections.AppendLine("4. Study Design");
        sections.AppendLine("   4.1 Overall Design");
        sections.AppendLine("   4.2 Scientific Rationale for Study Design");
        sections.AppendLine("   4.3 Justification for Dose");
        sections.AppendLine("   4.4 End of Study Definition");
        sections.AppendLine("5. Study Population");
        sections.AppendLine("   5.1 Inclusion Criteria");
        sections.AppendLine("   5.2 Exclusion Criteria");
        sections.AppendLine("   5.3 Lifestyle Considerations");
        sections.AppendLine("   5.4 Screen Failures");
        sections.AppendLine("6. Study Intervention");
        sections.AppendLine("   6.1 Study Intervention(s) Administered");
        sections.AppendLine("   6.2 Preparation, Handling, Storage and Accountability");
        sections.AppendLine("   6.3 Measures to Minimize Bias: Randomization and Blinding");
        sections.AppendLine("   6.4 Study Intervention Compliance");
        sections.AppendLine("   6.5 Concomitant Therapy");
        sections.AppendLine("7. Discontinuation of Study Intervention and Participant Discontinuation/Withdrawal");
        sections.AppendLine("8. Study Assessments and Procedures");
        sections.AppendLine("   8.1 Efficacy Assessments");
        sections.AppendLine("   8.2 Safety Assessments");
        sections.AppendLine("   8.3 Adverse Events and Serious Adverse Events");
        sections.AppendLine("   8.4 Pharmacokinetics / Pharmacodynamics");
        sections.AppendLine("   8.5 Genetics");
        sections.AppendLine("   8.6 Biomarkers");
        sections.AppendLine("9. Statistical Considerations");
        sections.AppendLine("   9.1 Statistical Hypotheses");
        sections.AppendLine("   9.2 Sample Size Determination");
        sections.AppendLine("   9.3 Populations for Analyses");
        sections.AppendLine("   9.4 Statistical Analyses");
        sections.AppendLine("   9.5 Interim Analyses");
        sections.AppendLine("10. Supporting Documentation and Operational Considerations");
        sections.AppendLine("    10.1 Regulatory and Ethical Considerations");
        sections.AppendLine("    10.2 Informed Consent Process");
        sections.AppendLine("    10.3 Data Handling and Record Keeping");
        sections.AppendLine("    10.4 Quality Assurance and Quality Control");
        sections.AppendLine("    10.5 Publication Policy");
        sections.AppendLine("11. References");
        sections.AppendLine("12. Appendices (Abbreviations, Protocol Amendment History)");

        if (!string.IsNullOrWhiteSpace(synopsisText))
        {
            sections.AppendLine();
            sections.AppendLine("=== Synopsis (extracted from uploaded PDF) ===");
            sections.AppendLine(synopsisText);
        }

        if (!string.IsNullOrWhiteSpace(notes))
        {
            sections.AppendLine();
            sections.AppendLine("=== Additional Notes ===");
            sections.AppendLine(notes);
        }

        return await InvokeAgent(_protocolAgentId, _protocolAgentAlias, sections.ToString());
    }

    // ── Medical text analysis ────────────────────────────────────────────────

    /// <summary>
    /// Runs SDOH extraction, ICD-10-CM coding, or both against free clinical text.
    /// </summary>
    /// <param name="clinicalText">Free-text clinical notes or patient narrative.</param>
    /// <param name="analysisType">sdoh, icd10, or both.</param>
    /// <param name="procedureType">Type of procedure context for ICD-10 coding.</param>
    public async Task<string> AnalyzeMedicalText(
        string clinicalText,
        string analysisType,
        string? procedureType = null)
    {
        var normalizedType = analysisType.Trim().ToLowerInvariant();
        if (normalizedType != "sdoh" && normalizedType != "icd10" && normalizedType != "both")
            return "Unsupported analysis type. Use sdoh, icd10, or both.";

        var response = await InvokeAgent(_jslMedicalAgentId, _jslMedicalAgentAlias, clinicalText);
        if (response == null) return "Failed to get a response from the JSLMedical agent.";
        return await GetResponseText(response);
    }

    // ── Drug pipeline data harmonisation ─────────────────────────────────────

    /// <summary>
    /// Analyzes free text for drug development pipeline data.
    /// </summary>
    /// <param name="pipelineText">Free-text pipeline notes, asset updates, trial summaries, or portfolio data.</param>
    public async Task<string> AnalyzeDrugPipeline(string pipelineText)
    {
        var response = await InvokeAgent(_drugPipelineAgentId, _drugPipelineAgentAlias, pipelineText);
        if (response == null) return "Failed to get a response from the drug pipeline agent.";
        return await GetResponseText(response);
    }
}
