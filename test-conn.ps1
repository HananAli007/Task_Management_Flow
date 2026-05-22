$connectionString = "Server=192.168.18.69;Database=Task_Management_System;User Id=sa;Password=sa123456;TrustServerCertificate=True;MultipleActiveResultSets=True;Connection Timeout=10;"
try {
    $conn = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Id, Name, Email, Role FROM AspNetUsers"
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dataset = New-Object System.Data.DataSet
    $adapter.Fill($dataset) | Out-Null
    Write-Host "USERS IN SERVER DATABASE:"
    $dataset.Tables[0] | Format-Table -AutoSize | Out-String | Write-Host
    $conn.Close()
} catch {
    Write-Host "ERROR: $_"
}
