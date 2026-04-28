using Amazon;
using Amazon.BedrockAgentRuntime;
using Amazon.BedrockAgentRuntime.Model;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.VisualBasic;

public class AwsService()
{
    private static AmazonBedrockAgentRuntimeClient client = new AmazonBedrockAgentRuntimeClient(RegionEndpoint.EUCentral1);

    private static InvokeAgentRequest request = new InvokeAgentRequest{
        AgentId = "",
        AgentAliasId = "",
        SessionId = Guid.NewGuid().ToString(),
        InputText = ""
    };
    
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
            AgentId = "OHR3RRDQQ5",
            AgentAliasId = "2KHPYNWIQS",
            SessionId = Guid.NewGuid().ToString(),
            InputText = formattedInput 
        };

        try 
        {
            var response = await client.InvokeAgentAsync(request);
            
            return response;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Greška: {ex.Message}");
            return null;
        }
    }


}