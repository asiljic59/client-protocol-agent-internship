using Markdig;
using PuppeteerSharp;
using PuppeteerSharp.Media;

public class ProtocolPdfService
{
    private const string ProtocolCss = @"
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

    private readonly MarkdownPipeline _markdownPipeline;

    public ProtocolPdfService()
    {
        _markdownPipeline = new MarkdownPipelineBuilder()
            .UseAdvancedExtensions()
            .Build();
    }

    public async Task<byte[]> ConvertMarkdownToPdf(string markdown)
    {
        var html = Markdown.ToHtml(markdown, _markdownPipeline);
        var fullHtml = WrapHtmlDocument(html);

        return await RenderHtmlToPdf(fullHtml);
    }

    private static string WrapHtmlDocument(string html)
    {
        return "<!DOCTYPE html><html><head><meta charset='utf-8'/><style>"
            + ProtocolCss
            + "</style></head><body>"
            + html
            + "</body></html>";
    }

    private static async Task<byte[]> RenderHtmlToPdf(string html)
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
            WaitUntil = new[] { WaitUntilNavigation.Networkidle0 }
        });

        return await page.PdfDataAsync(new PdfOptions
        {
            Format = PaperFormat.A4,
            MarginOptions = new MarginOptions
            {
                Top = "2cm",
                Bottom = "2cm",
                Left = "2cm",
                Right = "2cm"
            },
            PrintBackground = true
        });
    }
}
