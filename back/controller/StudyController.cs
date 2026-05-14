using Microsoft.AspNetCore.Mvc;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

[ApiController]
[Route("api/[controller]")]
public class StudyController : ControllerBase
{
    private readonly AwsService _awsService;
    private readonly ProtocolPdfService _protocolPdfService;

    public StudyController(AwsService awsService, ProtocolPdfService protocolPdfService)
    {
        _awsService = awsService;
        _protocolPdfService = protocolPdfService;
    }

    [HttpPost]
    [RequestSizeLimit(50_000_000)]
    public async Task<IActionResult> PostStudy([FromForm] IFormFile? synopsis, [FromForm] string? notes)
    {
        if ((synopsis == null || synopsis.Length == 0) && string.IsNullOrWhiteSpace(notes))
            return BadRequest("Upload a synopsis PDF or provide notes.");

        string synopsisText = string.Empty;
        if (synopsis != null && synopsis.Length > 0)
        {
            if (!string.Equals(Path.GetExtension(synopsis.FileName), ".pdf", StringComparison.OrdinalIgnoreCase))
                return BadRequest("Only PDF files are accepted.");

            try
            {
                synopsisText = await ExtractPdfText(synopsis);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"PDF extraction error: {ex.Message}");
                return BadRequest("Could not read the uploaded PDF.");
            }
        }

        var result = await _awsService.GenerateProtocol(synopsisText, notes);
        if (result == null)
            return StatusCode(500, "Greska pri generisanju protokola");

        string generatedText = await _awsService.GetResponseText(result);
        var pdfBytes = await _protocolPdfService.ConvertMarkdownToPdf(generatedText);

        return File(pdfBytes, "application/pdf", "protocol.pdf");
    }

    private static async Task<string> ExtractPdfText(IFormFile file)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        ms.Position = 0;

        var sb = new System.Text.StringBuilder();
        using var document = PdfDocument.Open(ms);
        foreach (Page page in document.GetPages())
        {
            sb.AppendLine(page.Text);
        }
        return sb.ToString();
    }

    [HttpPost("medical-analysis")]
    public async Task<IActionResult> AnalyzeMedicalText([FromBody] MedicalAnalysisRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("Clinical text is required.");

        if (string.IsNullOrWhiteSpace(request.AnalysisType))
            return BadRequest("Analysis type is required.");

        var result = await _awsService.AnalyzeMedicalText(
            request.Text,
            request.AnalysisType,
            request.ProcedureType);

        return Ok(result);
    }

    [HttpPost("drug-pipeline")]
    public async Task<IActionResult> AnalyzeDrugPipeline([FromBody] DrugPipelineRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("Pipeline text is required.");

        var result = await _awsService.AnalyzeDrugPipeline(request.Text);

        return Ok(result);
    }

    [HttpPost("markdown-pdf")]
    public async Task<IActionResult> DownloadMarkdownAsPdf([FromBody] MarkdownPdfRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Text))
            return BadRequest("Text is required.");

        var fileName = string.IsNullOrWhiteSpace(request.FileName)
            ? "analysis.pdf"
            : request.FileName;

        if (!fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            fileName += ".pdf";

        var pdfBytes = await _protocolPdfService.ConvertMarkdownToPdf(request.Text);

        return File(pdfBytes, "application/pdf", fileName);
    }
}

public record MedicalAnalysisRequest(string Text, string AnalysisType, string? ProcedureType);

public record DrugPipelineRequest(string Text);

public record MarkdownPdfRequest(string Text, string? FileName);
