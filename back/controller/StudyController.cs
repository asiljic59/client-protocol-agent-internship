

using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class StudyController : ControllerBase
{
    [HttpPost]
    public IActionResult PostStudy() => Ok(new String("Bravo, pozvao si kontroler!"));
}