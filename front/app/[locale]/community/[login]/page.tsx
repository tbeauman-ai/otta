import Navbar from "../../../components/navigation/Navbar";
import ProfileBanner from "../../../components/community/ProfileBanner";
import ProfileStats from "../../../components/community/ProfileStats";
import MatchHistory from "../../../components/community/MatchHistory";
import ProfileSearchBar from "../../../components/community/ProfileSearchBar";
import LoggedInBadge from "../../../components/login/LoggedInBadge";
import ProfileMood from "../../../components/community/ProfileMood";
import { notFound } from "next/navigation";

export default async function CommunityProfilePage({
	 params } : {
		 params : Promise<{ login : string}>})
{

	const { login }= await params;
	const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${login}`, {
		cache: "no-store",
	});
	if (!res.ok)
	{
		notFound();
	}
	const user = await res.json();

	return (
		<main
		className=" overflow-x-hidden md:overflow-y-hidden min-h-screen bg-[url('/homepage_bg.png')] bg-cover bg-center">

			<Navbar />
			<div className="md:py-5" />	

			<div className="max-w-6xl mx-auto px-4 py-4">
				<ProfileSearchBar />
				<ProfileBanner username={login} mood={user?.moodphrase ?? "No mood yet..."} /*isOnline={false}*/ avatarUrl={user.avatarUrl} />
			</div>

			<section className="max-w-6xl mx-auto h-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
				<ProfileStats username={login} />
				<MatchHistory username={login} />
			</section>
		</main>
	);
}
