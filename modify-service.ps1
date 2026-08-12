$path = \"ollmodel\src\modules\admin\admin.service.js\"
$lines = Get-Content -Path $path
# Insert hashPassword import after the AppError require line
$importLine = \"const { hashPassword } = require('../../core/utils/password.util');\"
$idx = ($lines | Select-String \"const { AppError } = require\\('..\\/..\\/core\\/errors\\/AppError'\\\); \").LineNumber
if ($idx) {
  $lines = $lines[0..($idx)] + @($importLine) + $lines[($idx+1)..$($lines.Length-1)]
}
# Find the line where module.exports starts
$moduleIdx = ($lines | Select-String 'module.exports = {').LineNumber - 1
$before = $lines[0..($moduleIdx-1)]
$after = $lines[$moduleIdx..($lines.Length-1)]
$newAfter = @(
  'module.exports = {',
  '  getDashboardMetrics,',
  '  listClinics,',
  '  listUsers,',
  '  createUser: async (req, data) => {',
  '    try {',
  '      const { username, email, password, role, isActive = true } = data;',
  '      const hashedPassword = await hashPassword(password);',
  '      const user = await repository.createUser({',
  '        username,',
  '        email,',
  '        password: hashedPassword,',
  '        role,',
  '        isActive: isActive ?? true,',
  '        organizationId: req.user.organizationId',
  '      });',
  '      return { id: user.id };',
  '    } catch (error) {',
  '      throw error;',
  '    }',
  '  },',
  '}'
)
$newLines = $before + $newAfter
Set-Content -Path $path -Value $newLines -Encoding ASCII
