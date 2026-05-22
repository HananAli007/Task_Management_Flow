$body = @{
    email = "Yousaf123@example.com"
    password = "password"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://192.168.18.69/backend-api/Auth/login" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "SUCCESS:"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "STATUS CODE: $_.Exception.Response.StatusCode"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $responseBody = $reader.ReadToEnd()
    Write-Host "RESPONSE BODY:"
    Write-Host $responseBody
}
