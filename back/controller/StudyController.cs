using Markdig;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using PuppeteerSharp;
using PuppeteerSharp.Media;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class StudyController : ControllerBase
{
    private readonly AwsService _awsService;

    public StudyController(AwsService awsService)
    {
        _awsService = awsService;
    }

    [HttpPost]
    public async Task<IActionResult> PostStudy([FromBody] Research research)
    {
        if (research == null) return BadRequest("Podaci nisu stigli!");

        var result = await _awsService.GenerateProtocol(research);
        if (result == null)
            return StatusCode(500, "Greska pri generisanju protokola");

        string generatedText = await _awsService.GetResponseText(result);

        // Convert Markdown → HTML
        var pipeline = new MarkdownPipelineBuilder()
            .UseAdvancedExtensions() // tables, task lists, etc.
            .Build();
        string html = Markdown.ToHtml(generatedText, pipeline);

        // Wrap in a full HTML document with basic styling
        string css = @"
            body { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; }
            h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 6px; }
            h2 { font-size: 18px; color: #2c3e50; margin-top: 24px; }
            h3 { font-size: 15px; color: #34495e; }
            table { border-collapse: collapse; width: 100%; margin: 12px 0; }
            th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            code, pre { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
            blockquote { border-left: 4px solid #ccc; padding-left: 12px; color: #555; }
            hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
        ";

        string fullHtml = "<!DOCTYPE html><html><head><meta charset='utf-8'/><style>"
                        + css
                        + "</style></head><body>"
                        + html
                        + "</body></html>";

        // HTML → PDF via PuppeteerSharp
        var pdfBytes = await RenderHtmlToPdf(fullHtml);

        return File(pdfBytes, "application/pdf", "protocol.pdf");
    }

    private async Task<byte[]> RenderHtmlToPdf(string html)
    {
        await new BrowserFetcher().DownloadAsync();

        await using var browser = await Puppeteer.LaunchAsync(new LaunchOptions
        {
            Headless = true,
            Args = new[] { "--no-sandbox", "--disable-setuid-sandbox" }
        });

        await using var page = await browser.NewPageAsync();
        await page.SetContentAsync(html, new NavigationOptions
        {
            WaitUntil = new[] { WaitUntilNavigation.Networkidle0 }  // lowercase 'i'
        });

        return await page.PdfDataAsync(new PdfOptions
        {
            Format = PaperFormat.A4,
            MarginOptions = new MarginOptions
            {
                Top = "2cm", Bottom = "2cm",
                Left = "2cm", Right = "2cm"
            },
            PrintBackground = true
        });
    }
}