using Amazon;
using Amazon.BedrockAgentRuntime;
using Amazon.BedrockAgentRuntime.Model;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.VisualBasic;
using System.Text;

public class AwsService()
{
    private readonly AmazonBedrockAgentRuntimeClient _client = new AmazonBedrockAgentRuntimeClient(RegionEndpoint.EUCentral1);
    private readonly string _agentId = "IGYYQY3KMD";
    private readonly string _agentAlias = "RTNNYSQQV8";

    
    public async Task<InvokeAgentResponse?> GenerateProtocol(Research study)
    {
        string formattedInput = $@"
        Generate a Clinical Trial Protocol draft based on the following details:
        - Study Title: {study.StudyTitle}
        - Therapeutic Area: {study.TherapeuticArea}
        - Disease: {study.Disease}
        - Phase: {study.Phase}
        - Sample Size: {study.SampleSize}
        - Number of Arms: {study.Arms}
        - Comparator: {study.Comparator}
        - Countries: {study.Countries}
        - Additional Notes: {study.Notes}";

        var request = new InvokeAgentRequest
        {
            AgentId = this._agentId,
            AgentAliasId = this._agentAlias,
            SessionId = Guid.NewGuid().ToString(),
            InputText = formattedInput 
        };

        try 
        {
            var response = await _client.InvokeAgentAsync(request);
            
            return response;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Greška: {ex.Message}");
            return null;
        }
    }

    public async Task<string> GetResponseText(InvokeAgentResponse response)
    {
        var sb = new StringBuilder();

        await foreach (var ev in response.Completion)
        {
            if (ev is PayloadPart chunk)
            {
                using var reader = new StreamReader(chunk.Bytes);
                var text = await reader.ReadToEndAsync();

                if (!string.IsNullOrWhiteSpace(text))
                {
                    sb.Append(text);
                }
            }
        }

        return sb.ToString();
    }


}