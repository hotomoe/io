export class vacationMode1724078037441 {
	name = 'vacationMode1724078037441'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "user" ADD "isVacation" boolean NOT NULL DEFAULT false`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isVacation"`);
	}
}
