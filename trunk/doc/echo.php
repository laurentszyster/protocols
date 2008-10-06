<?php
$fd = fopen("php://input", "r");
while ($data = fread($fd, 16384)) echo $data;
fclose($fd);
?> 