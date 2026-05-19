<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once __DIR__ . '/lib/phpmailer/Exception.php';
require_once __DIR__ . '/lib/phpmailer/PHPMailer.php';
require_once __DIR__ . '/lib/phpmailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

// Anti-spam : honeypot
if (!empty($_POST['website'])) {
    echo json_encode(['success' => false, 'message' => 'Spam détecté']);
    exit;
}

// ─── Load SMTP password from .env ─────────────────────────────────────────────
$smtpPassword = '';
$envFile = file_exists(dirname(__DIR__) . '/.env')
    ? dirname(__DIR__) . '/.env'
    : __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, 'SMTP_PASSWORD=') === 0) {
            $smtpPassword = trim(substr($line, 14));
            $smtpPassword = trim($smtpPassword, '"\'');
            break;
        }
    }
}

function sendViaSMTP($to, $subject, $htmlBody, $altBody, $smtpPwd, $replyTo = '', $replyToName = '', $bcc = '') {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = 'smtp.hostinger.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'contact@lyaeco.com';
    $mail->Password   = $smtpPwd;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port       = 465;
    $mail->CharSet    = 'UTF-8';
    $mail->setFrom('contact@lyaeco.com', 'LYAECO Web');
    $mail->addAddress($to);
    if (!empty($bcc))     $mail->addBCC($bcc);
    if (!empty($replyTo)) $mail->addReplyTo($replyTo, $replyToName ?: $replyTo);
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $htmlBody;
    $mail->AltBody = $altBody;
    return $mail->send();
}

// Basic validation
$type      = isset($_POST['type'])      ? htmlspecialchars(strip_tags($_POST['type']))      : 'contact';
$nom       = isset($_POST['nom'])       ? htmlspecialchars(strip_tags($_POST['nom']))       : '';
$email     = isset($_POST['email'])     ? filter_var($_POST['email'], FILTER_SANITIZE_EMAIL) : '';
$telephone = isset($_POST['telephone']) ? htmlspecialchars(strip_tags($_POST['telephone'])) : '';

if (empty($nom) || empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Données invalides']);
    exit;
}

// ─── TYPE devis-ia ────────────────────────────────────────────────────────────
if ($type === 'devis-ia') {
    $pack       = isset($_POST['pack'])        ? htmlspecialchars(strip_tags($_POST['pack']))       : '';
    $optsRaw    = isset($_POST['options'])     ? $_POST['options']                                  : '[]';
    $opts       = json_decode($optsRaw, true) ?: [];
    $prixTotal  = isset($_POST['prix_total'])  ? intval($_POST['prix_total'])                       : 0;
    $resume     = isset($_POST['resume'])      ? htmlspecialchars(strip_tags($_POST['resume']))     : '';
    $entreprise = isset($_POST['entreprise'])  ? htmlspecialchars(strip_tags($_POST['entreprise'])) : '';
    $adresse    = isset($_POST['adresse'])     ? htmlspecialchars(strip_tags($_POST['adresse']))    : '';
    $metierIa   = isset($_POST['metier'])      ? htmlspecialchars(strip_tags($_POST['metier']))     : '';
    $references = isset($_POST['references'])  ? htmlspecialchars(strip_tags($_POST['references'])) : '';
    $maintRaw        = isset($_POST['maintenance'])        ? $_POST['maintenance']                               : 'null';
    $maintenance     = json_decode($maintRaw, true); // null or {label, prix}
    $auditTel        = isset($_POST['audit_telephonique']) && $_POST['audit_telephonique'] === '1';

    $packLabels = ['M1' => 'Pack Vitrine', 'M2' => 'Pack Réservation', 'M3' => 'Pack Boutique'];
    $packPrix   = ['M1' => 380, 'M2' => 600, 'M3' => 1500];
    $packDescs  = [
        'M1' => 'Présentation de votre activité + formulaire de contact',
        'M2' => 'Site vitrine + module réservation en ligne',
        'M3' => 'Boutique e-commerce complète avec paiement sécurisé'
    ];
    $prixBase  = $packPrix[$pack] ?? '?';
    $packLabel = isset($packLabels[$pack]) ? $packLabels[$pack] . " ({$prixBase}€)" : strtoupper($pack);
    $packDesc  = $packDescs[$pack] ?? '';

    $optsRows  = '';
    $optsText  = '';
    foreach ($opts as $opt) {
        if (!is_array($opt)) continue;
        $optNom  = htmlspecialchars($opt['label'] ?? $opt['nom'] ?? '');
        $optPrix = intval($opt['prix'] ?? 0);
        $optQty  = intval($opt['quantite'] ?? 1);
        $optTot  = $optPrix * max($optQty, 1);
        // Old-flow fallback: detect maintenance in options, skip (shown in maint block)
        if (stripos($optNom, 'maintenance') !== false) {
            if (!$maintenance) $maintenance = ['label' => $optNom, 'prix' => $optPrix];
            continue;
        }
        $prixStr = $optTot > 0 ? "+{$optTot}€" : '';
        $optsRows .= "<tr>
            <td style='padding:5px 0;color:#475569;font-size:13px;'>✓ $optNom</td>
            <td style='padding:5px 0;color:#0284c7;font-size:13px;font-weight:700;text-align:right;'>$prixStr</td>
          </tr>";
        $optsText .= "  ✓ $optNom" . ($prixStr ? " $prixStr" : '') . "\n";
    }
    if (empty($optsRows)) {
        $optsRows = "<tr><td style='color:#94a3b8;font-size:13px;' colspan='2'>Aucune option supplémentaire</td></tr>";
        $optsText = "  Aucune option supplémentaire\n";
    }

    $resumeBlock = $resume ? "<tr><td style='padding:0 40px 14px;'>
        <div style='background:#f8fafc;border-left:3px solid #0284c7;padding:12px 16px;border-radius:0 8px 8px 0;'>
          <div style='font-size:10px;font-weight:800;color:#0284c7;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;'>Votre besoin</div>
          <p style='margin:0;font-size:13px;color:#475569;font-style:italic;'>&#171; $resume &#187;</p>
        </div></td></tr>" : '';

    $maintPrix  = $maintenance ? intval($maintenance['prix'] ?? 50) : 0;
    $maintNote  = $maintenance ? "<tr><td style='padding:0 40px 14px;'>
        <div style='background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:10px 14px;'>
          <p style='margin:0;font-size:11px;color:#713f12;line-height:1.5;'><strong>ℹ️ Maintenance technique +{$maintPrix}€/mois :</strong> mises à jour de sécurité, sauvegardes, support technique. N'inclut <u>pas</u> la gestion de contenu (articles, modifications de pages, nouveaux produits).</p>
        </div></td></tr>" : '';

    $clientRows = '';
    if (!empty($telephone))  $clientRows .= "<tr><td style='padding:2px 0;font-size:12px;color:#475569;'><strong>Tél :</strong> $telephone</td></tr>";
    if (!empty($entreprise)) $clientRows .= "<tr><td style='padding:2px 0;font-size:12px;color:#475569;'><strong>Entreprise :</strong> $entreprise</td></tr>";
    if (!empty($adresse))    $clientRows .= "<tr><td style='padding:2px 0;font-size:12px;color:#475569;'><strong>Adresse :</strong> $adresse</td></tr>";
    if (!empty($metierIa))   $clientRows .= "<tr><td style='padding:2px 0;font-size:12px;color:#475569;'><strong>Métier :</strong> $metierIa</td></tr>";

    $refBlock = $references ? "<tr><td style='padding:0 40px 14px;'>
        <div style='font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;'>Sites de référence</div>
        <p style='margin:0;font-size:12px;color:#475569;'>$references</p>
      </td></tr>" : '';

    $auditBlock = $auditTel ? "<tr><td style='padding:0 40px 14px;'>
        <div style='background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;'>
          <p style='margin:0;font-size:12px;color:#166534;line-height:1.5;'>📞 <strong>Audit téléphonique gratuit demandé</strong> — Ce client souhaite être rappelé(e) pour un audit téléphonique gratuit.</p>
        </div></td></tr>" : '';

    $subject = "Votre devis LYAECO — $packLabel";

    $htmlBody = "
<html><body style='font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f8fafc;padding:32px 16px;'>
<tr><td align='center'>
<table width='560' cellpadding='0' cellspacing='0' style='background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,.09);'>
  <tr><td style='background:linear-gradient(135deg,#1e40af,#0284c7);padding:32px 40px;text-align:center;'>
    <div style='font-size:40px;margin-bottom:8px;'>🤖</div>
    <h1 style='margin:0;color:#fff;font-size:22px;font-weight:900;'>Votre devis LYAECO</h1>
    <p style='margin:8px 0 0;color:rgba(255,255,255,.8);font-size:13px;'>Généré par votre assistant IA · Gratuit &amp; sans engagement</p>
  </td></tr>
  <tr><td style='padding:28px 40px 14px;'>
    <p style='margin:0 0 6px;font-size:15px;color:#1e293b;'>Bonjour <strong>$nom</strong>,</p>
    <p style='margin:0;font-size:13px;color:#64748b;line-height:1.65;'>Suite à notre conversation, voici votre devis estimé. Notre équipe vous contactera sous 24h pour finaliser votre projet.</p>
  </td></tr>
  $resumeBlock
  <tr><td style='padding:0 40px 14px;'>
    <div style='background:linear-gradient(135deg,#eff6ff,#e0f2fe);border:2px solid #bfdbfe;border-radius:12px;padding:18px;'>
      <div style='font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0284c7;margin-bottom:7px;'>Formule recommandée</div>
      <div style='font-size:19px;font-weight:900;color:#1e3a8a;margin-bottom:4px;'>$packLabel</div>
      <div style='font-size:12px;color:#64748b;'>$packDesc</div>
    </div>
  </td></tr>
  <tr><td style='padding:0 40px 14px;'>
    <div style='font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;'>Options additionnelles</div>
    <table width='100%' cellpadding='0' cellspacing='0'>$optsRows</table>
  </td></tr>
  $maintNote
  <tr><td style='padding:0 40px 14px;'>
    <table width='100%' cellpadding='12' cellspacing='0' style='background:#1e40af;border-radius:10px;'>
      <tr>
        <td style='color:rgba(255,255,255,.82);font-size:13px;font-weight:700;'>Total estimé HT</td>
        <td style='text-align:right;color:#fff;font-size:26px;font-weight:900;'>{$prixTotal}€</td>
      </tr>
    </table>
    <p style='margin:6px 0 0;font-size:10px;color:#94a3b8;text-align:right;'>Paiement à la livraison · Devis valable 30 jours</p>
  </td></tr>
  $refBlock
  $auditBlock
  <tr><td style='padding:0 40px 14px;text-align:center;'>
    <a href='https://wa.me/33781712324' style='display:inline-block;background:linear-gradient(135deg,#25d366,#1ebe5d);color:#fff;text-decoration:none;padding:13px 30px;border-radius:10px;font-weight:800;font-size:14px;'>💬 Discuter sur WhatsApp</a>
  </td></tr>
  <tr><td style='padding:0 40px 20px;border-top:1px solid #f1f5f9;padding-top:16px;'>
    <table cellpadding='0' cellspacing='0'>
      <tr><td style='padding:3px 0;font-size:13px;color:#0f172a;'><strong>$nom</strong></td></tr>
      <tr><td style='padding:2px 0;font-size:12px;color:#64748b;'>$email</td></tr>
      $clientRows
    </table>
    <p style='margin:14px 0 0;font-size:11px;color:#cbd5e1;'>Ce devis est estimatif. Un devis définitif sera établi après échange avec notre équipe.</p>
  </td></tr>
  <tr><td style='background:#f8fafc;padding:14px 40px;text-align:center;border-top:1px solid #f1f5f9;'>
    <p style='margin:0;font-size:11px;color:#94a3b8;'>LYAECO Web · contact@lyaeco.com · 07 81 71 23 24 · <a href='https://lyaeco.com' style='color:#0284c7;'>lyaeco.com</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>";

    $altBody = "Bonjour $nom,\n\nVoici votre devis LYAECO.\n\n"
        . "Formule : $packLabel\n$packDesc\n\n"
        . "Options additionnelles :\n$optsText\n"
        . "Total estimé HT : {$prixTotal}€\n"
        . ($maintenance ? "Maintenance technique : +{$maintPrix}€/mois (hors total)\n" : "")
        . ($resume ? "\nVotre besoin : « $resume »\n" : "")
        . ($auditTel ? "\n📞 Audit téléphonique gratuit demandé — rappeler ce client.\n" : "")
        . "\nDevis valable 30 jours. Notre équipe vous contactera sous 24h.\n\n"
        . "LYAECO Web — contact@lyaeco.com — 07 81 71 23 24 — lyaeco.com";

    try {
        sendViaSMTP($email, $subject, $htmlBody, $altBody, $smtpPassword, '', '', 'contact@lyaeco.com');
        echo json_encode(['success' => true, 'message' => 'Devis envoyé']);
    } catch (PHPMailerException $e) {
        error_log('[LYAECO] PHPMailer error: ' . $e->getMessage());
        echo json_encode(['success' => false, 'message' => "Erreur d'envoi. Contactez-nous par WhatsApp."]);
    }
    exit;
}

// ─── TYPE contact / devis ─────────────────────────────────────────────────────
$sujet        = isset($_POST['sujet'])        ? htmlspecialchars(strip_tags($_POST['sujet']))        : '';
$message      = isset($_POST['message'])      ? htmlspecialchars(strip_tags($_POST['message']))      : '';
$offre        = isset($_POST['offre'])        ? htmlspecialchars(strip_tags($_POST['offre']))        : '';
$metier       = isset($_POST['metier'])       ? htmlspecialchars(strip_tags($_POST['metier']))       : '';
$objectif     = isset($_POST['objectif'])     ? htmlspecialchars(strip_tags($_POST['objectif']))     : '';
$pages        = isset($_POST['pages'])        ? htmlspecialchars(strip_tags($_POST['pages']))        : '';
$siteExistant = isset($_POST['site_existant']) ? htmlspecialchars(strip_tags($_POST['site_existant'])) : '';

$subject = $type === 'devis'
    ? "Nouvelle demande de devis LYAECO — $nom"
    : "Nouveau message de contact LYAECO — $nom";

$htmlBody = "<html><body style='font-family:Arial,sans-serif;line-height:1.6;'>";
$htmlBody .= "<h2 style='color:#2563eb;'>" . ($type === 'devis' ? 'Nouvelle demande de devis' : 'Nouveau message de contact') . " — LYAECO</h2><hr>";
$htmlBody .= "<p><strong>Nom :</strong> $nom</p>";
$htmlBody .= "<p><strong>Email :</strong> <a href='mailto:$email'>$email</a></p>";
if (!empty($telephone))    $htmlBody .= "<p><strong>Téléphone :</strong> <a href='tel:$telephone'>$telephone</a></p>";
if (!empty($sujet))        $htmlBody .= "<p><strong>Sujet :</strong> $sujet</p>";
if (!empty($offre))        $htmlBody .= "<p><strong>Offre choisie :</strong> $offre</p>";
if (!empty($metier))       $htmlBody .= "<p><strong>Métier :</strong> $metier</p>";
if (!empty($siteExistant)) $htmlBody .= "<p><strong>Site existant ?</strong> $siteExistant</p>";
if (!empty($objectif))     $htmlBody .= "<p><strong>Objectif :</strong> $objectif</p>";
if (!empty($pages))        $htmlBody .= "<p><strong>Pages :</strong> $pages</p>";
$htmlBody .= "<hr><p><strong>Message :</strong></p>";
$htmlBody .= "<p style='background:#f8fafc;padding:16px;border-radius:8px;'>" . nl2br($message) . "</p>";
$htmlBody .= "<hr><p style='color:#94a3b8;font-size:12px;'>Envoyé depuis lyaeco.com le " . date('d/m/Y à H:i') . "</p>";
$htmlBody .= "</body></html>";

$altBody = "$subject\n\nNom : $nom\nEmail : $email\n"
    . (!empty($telephone) ? "Tél : $telephone\n" : "")
    . (!empty($message)   ? "\nMessage :\n$message\n" : "")
    . "\nEnvoyé le " . date('d/m/Y à H:i');

try {
    sendViaSMTP('contact@lyaeco.com', $subject, $htmlBody, $altBody, $smtpPassword, $email, $nom);
    echo json_encode(['success' => true, 'message' => 'Message envoyé']);
} catch (PHPMailerException $e) {
    error_log('[LYAECO] PHPMailer error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => "Erreur d'envoi. Réessayez ou contactez-nous par WhatsApp."]);
}
