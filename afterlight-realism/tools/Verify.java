import com.android.apksig.ApkVerifier;
import java.io.File;
public class Verify { public static void main(String[] a) throws Exception {
  ApkVerifier.Result r = new ApkVerifier.Builder(new File(a[0])).build().verify();
  System.out.println("verified=" + r.isVerified() + " v2=" + r.isVerifiedUsingV2Scheme() + " v3=" + r.isVerifiedUsingV3Scheme() + " errors=" + r.getErrors().size());
  for (var c : r.getSignerCertificates()) System.out.println(c.getSubjectX500Principal());
}}
